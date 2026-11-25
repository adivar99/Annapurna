package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/adivar99/annapurna-server/internal/ai"
	"github.com/adivar99/annapurna-server/internal/auth"
	"github.com/adivar99/annapurna-server/internal/hasura"
	"github.com/adivar99/annapurna-server/internal/store"
	"github.com/stretchr/testify/require"
)

const (
	testSecret = "unit-test-secret"
	testUID    = "11111111-1111-1111-1111-111111111111"
	otherUID   = "22222222-2222-2222-2222-222222222222"
)

var errFake = errors.New("fake storage failure")

// fakeHasura serves canned GraphQL responses keyed by operation name and
// records every request body for assertions.
type fakeHasura struct {
	mu      sync.Mutex
	bodies  []map[string]any // recorded {query, variables}
	respond func(op string, body map[string]any) (int, any)
}

func (f *fakeHasura) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	_ = json.NewDecoder(r.Body).Decode(&body)
	f.mu.Lock()
	f.bodies = append(f.bodies, body)
	respond := f.respond
	f.mu.Unlock()

	status, payload := respond(opNameOf(body["query"]), body)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func opNameOf(v any) string {
	query, _ := v.(string)
	fields := strings.Fields(query)
	if len(fields) >= 2 && (fields[0] == "query" || fields[0] == "mutation") {
		return strings.TrimSuffix(strings.SplitN(fields[1], "(", 2)[0], "(")
	}
	return ""
}

// calls returns the recorded operation names so far.
func (f *fakeHasura) calls() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	names := make([]string, 0, len(f.bodies))
	for _, b := range f.bodies {
		names = append(names, opNameOf(b["query"]))
	}
	return names
}

func (f *fakeHasura) lastBody() map[string]any {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.bodies[len(f.bodies)-1]
}

// unexpectedOp is the canned response for operations a test didn't stub; it
// surfaces loudly as a 500 whose message names the operation.
func unexpectedOp(op string) (int, any) {
	return http.StatusInternalServerError, map[string]any{
		"errors": []any{map[string]any{"message": "unexpected op: " + op}},
	}
}

// fakeFiles is a FileStore whose behavior each test controls via its knobs.
// RemovePrivate calls are recorded in removed; the object names handed to
// StatPrivate/PresignPrivate land in lastName so tests can assert scoping.
type fakeFiles struct {
	userObjectName   string
	publicObjectName string
	publicURL        string
	presignURL       string
	statExists       bool
	statTime         time.Time
	fail             bool

	mu       sync.Mutex
	removed  []string
	lastName string // most recent objectName passed to StatPrivate/PresignPrivate/RemovePrivate
}

func (f *fakeFiles) UploadUserFile(_ context.Context, _ io.Reader, _ int64, _, _, _ string) (string, error) {
	if f.fail {
		return "", errFake
	}
	return f.userObjectName, nil
}

func (f *fakeFiles) UploadPublicImage(_ context.Context, _ io.Reader, _ int64, _, _ string) (string, string, error) {
	if f.fail {
		return "", "", errFake
	}
	return f.publicObjectName, f.publicURL, nil
}

func (f *fakeFiles) StatPrivate(_ context.Context, objectName string) (time.Time, bool, error) {
	f.mu.Lock()
	f.lastName = objectName
	f.mu.Unlock()
	return f.statTime, f.statExists && !f.fail, nil
}

func (f *fakeFiles) PresignPrivate(_ context.Context, objectName string, _ time.Duration) (string, error) {
	if f.fail {
		return "", errFake
	}
	f.mu.Lock()
	f.lastName = objectName
	f.mu.Unlock()
	return f.presignURL, nil
}

func (f *fakeFiles) RemovePrivate(_ context.Context, objectName string) error {
	if f.fail {
		return errFake
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.removed = append(f.removed, objectName)
	return nil
}

// env bundles a running test server with its collaborators.
type env struct {
	Server *httptest.Server
	Fake   *fakeHasura
	Files  *fakeFiles
	Signer *auth.Signer
}

func (e *env) token(t *testing.T, userID string) string {
	t.Helper()
	tok, err := e.Signer.Generate(userID, userID+"@example.com")
	require.NoError(t, err)
	return tok.Value
}

// doJSON issues a request with an optional JSON body and returns the recorder.
// bearer may be empty for unauthenticated calls.
func (e *env) doJSON(t *testing.T, method, path, bearer string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	var reader io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		require.NoError(t, err)
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, e.Server.URL+path, reader)
	require.NoError(t, err)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	res, err := e.Server.Client().Do(req)
	require.NoError(t, err)
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	rec := httptest.NewRecorder()
	rec.Code = res.StatusCode
	rec.Body = bytes.NewBuffer(body)
	copyHeaders(rec.Header(), res.Header)
	return rec
}

// newMultipartWriter writes a single-file multipart form into buf, carrying an
// explicit per-part Content-Type (the handlers read it off the FileHeader).
func newMultipartWriter(buf io.Writer, field, fileName, contentType string, fileBytes []byte) *multipart.Writer {
	writer := multipart.NewWriter(buf)
	header := textproto.MIMEHeader{}
	header.Set("Content-Disposition",
		fmt.Sprintf(`form-data; name="%s"; filename="%s"`, escapeQuotes(field), escapeQuotes(fileName)))
	header.Set("Content-Type", contentType)
	part, err := writer.CreatePart(header)
	if err != nil {
		panic(err) // unreachable with these in-memory inputs
	}
	_, _ = part.Write(fileBytes)
	if err := writer.Close(); err != nil {
		panic(err)
	}
	return writer
}

// quoteEscaper escapes backslashes and quotes in multipart Content-Disposition
// parameters, per RFC 2045.
var quoteEscaper = strings.NewReplacer(`\`, `\\`, `"`, `\"`)

func escapeQuotes(s string) string {
	return quoteEscaper.Replace(s)
}

// getMultipart posts multipart/form-data with the given file field and returns
// the recorder. bearer may be empty for unauthenticated calls.
func (e *env) getMultipart(t *testing.T, path, bearer, field, fileName, contentType string, fileBytes []byte) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	writer := newMultipartWriter(&buf, field, fileName, contentType, fileBytes)
	req, err := http.NewRequest(http.MethodPost, e.Server.URL+path, &buf)
	require.NoError(t, err)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	res, err := e.Server.Client().Do(req)
	require.NoError(t, err)
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	rec := httptest.NewRecorder()
	rec.Code = res.StatusCode
	rec.Body = bytes.NewBuffer(body)
	copyHeaders(rec.Header(), res.Header)
	return rec
}

func copyHeaders(dst, src http.Header) {
	for k, vs := range src {
		for _, v := range vs {
			dst.Add(k, v)
		}
	}
}

func decodeJSON(t *testing.T, rec *httptest.ResponseRecorder, out any) {
	t.Helper()
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), out), "body: %s", rec.Body.String())
}

func newTestEnv(t *testing.T, respond func(op string, body map[string]any) (int, any)) *env {
	t.Helper()
	if respond == nil {
		respond = func(op string, _ map[string]any) (int, any) { return unexpectedOp(op) }
	}

	fake := &fakeHasura{respond: respond}
	hasuraSrv := httptest.NewServer(fake)
	t.Cleanup(hasuraSrv.Close)

	client := hasura.NewClient(hasuraSrv.URL, "admin-secret", hasuraSrv.Client())
	signer, err := auth.NewSigner(testSecret, "24h")
	require.NoError(t, err)

	files := &fakeFiles{
		userObjectName:   "userfolder/obj.bin",
		publicObjectName: "images/img.png",
		publicURL:        "http://localhost:9000/public-images/images/img.png",
		presignURL:       "http://localhost:9000/user-files/userfolder/obj.bin?sig=1",
		statExists:       true,
		statTime:         time.Date(2026, 8, 26, 12, 0, 0, 0, time.UTC),
	}

	handlers := &Handlers{
		Signer:    signer,
		UserStore: store.NewUsers(client),
		Recipes:   store.NewRecipes(client),
		Saved:     store.NewSaved(client),
		Chat:      store.NewChat(client),
		Files:     files,
		AIService: ai.NewService(""), // mock mode
		AIMock:    true,
	}
	router := NewRouter(handlers, slog.New(slog.NewTextHandler(io.Discard, nil)))
	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &env{Server: ts, Fake: fake, Files: files, Signer: signer}
}
