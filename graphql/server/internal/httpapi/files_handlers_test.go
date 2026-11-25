package httpapi

import (
	"net/http"
	"testing"
	"time"

	"github.com/adivar99/annapurna-server/internal/objectstore"
	"github.com/stretchr/testify/require"
)

func TestUploadFile_PrivateObject(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		t.Fatalf("unexpected op %q", op)
		return unexpectedOp(op)
	})

	rec := e.getMultipart(t, "/api/files/upload", e.token(t, testUID), "file",
		"notes.txt", "text/plain", []byte("hello"))
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var out struct {
		Success bool `json:"success"`
		Data    struct {
			ID          string `json:"id"`
			FileName    string `json:"file_name"`
			StoragePath string `json:"storage_path"`
			Size        int64  `json:"size"`
			ContentType string `json:"content_type"`
		} `json:"data"`
	}
	decodeJSON(t, rec, &out)
	require.True(t, out.Success)
	require.Equal(t, "userfolder/obj.bin", out.Data.ID)
	require.Equal(t, out.Data.ID, out.Data.StoragePath) // id IS the storage path now
	require.Equal(t, int64(5), out.Data.Size)
	require.Equal(t, "text/plain", out.Data.ContentType)
	require.Equal(t, "notes.txt", out.Data.FileName)
}

func TestUploadFile_TypeFilterMatrix(t *testing.T) {
	cases := []struct {
		name    string
		ct      string
		wantMsg string
	}{
		{"zip rejected on both routes", "application/zip", "Invalid file type"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
				t.Fatalf("storage must not be touched for a bad type")
				return unexpectedOp(op)
			})
			rec := e.getMultipart(t, "/api/files/upload", e.token(t, testUID), "file", "a.zip", tc.ct, []byte("PK"))
			require.Equal(t, http.StatusBadRequest, rec.Code)
			var body map[string]string
			decodeJSON(t, rec, &body)
			require.Equal(t, tc.wantMsg, body["message"])

			rec = e.getMultipart(t, "/api/files/upload-image", e.token(t, testUID), "image", "b.zip", tc.ct, []byte("PK"))
			require.Equal(t, http.StatusBadRequest, rec.Code)
		})
	}

	t.Run("pdf passes multer filter but not image-only route", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("upload-image must reject before storage")
			return unexpectedOp(op)
		})
		rec := e.getMultipart(t, "/api/files/upload-image", e.token(t, testUID), "image", "doc.pdf", "application/pdf", []byte("%PDF"))
		require.Equal(t, http.StatusBadRequest, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Only images are allowed", body["message"])
	})
}

func TestUploadImage_MissingFieldAndSuccess(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		t.Fatalf("unexpected op %q", op)
		return unexpectedOp(op)
	})

	t.Run("missing field 400", func(t *testing.T) {
		rec := e.getMultipart(t, "/api/files/upload-image", e.token(t, testUID), "wrong-field", "x.png", "image/png", []byte("png"))
		require.Equal(t, http.StatusBadRequest, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "No file uploaded", body["message"])
	})

	t.Run("success returns public url", func(t *testing.T) {
		rec := e.getMultipart(t, "/api/v1/files/upload-image", e.token(t, testUID), "image", "photo.png", "image/png", []byte("png-bytes"))
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

		var out struct {
			Data map[string]any `json:"data"`
		}
		decodeJSON(t, rec, &out)
		require.Equal(t, "images/img.png", out.Data["object_name"])
		require.Equal(t, "http://localhost:9000/public-images/images/img.png", out.Data["public_url"])
		require.InDelta(t, float64(len("png-bytes")), out.Data["size"], 0)
	})
}

func TestGetFile_ShapeAndScoping(t *testing.T) {
	fileID := "3f2a-uuid.bin"

	t.Run("presign shape", func(t *testing.T) {
		e := newTestEnv(t, nil)
		rec := e.doJSON(t, http.MethodGet, "/api/files/"+fileID, e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

		var out struct {
			Success bool `json:"success"`
			Data    struct {
				ID          string `json:"id"`
				FileName    string `json:"file_name"`
				DownloadURL string `json:"download_url"`
				ExpiresIn   int    `json:"expires_in"`
				UploadedAt  string `json:"uploaded_at"`
			} `json:"data"`
		}
		decodeJSON(t, rec, &out)
		require.True(t, out.Success)
		require.Equal(t, fileID, out.Data.ID)
		require.Equal(t, fileID, out.Data.FileName)
		require.Equal(t, "http://localhost:9000/user-files/userfolder/obj.bin?sig=1", out.Data.DownloadURL)
		require.Equal(t, 3600, out.Data.ExpiresIn)
		require.Equal(t, time.Date(2026, 8, 26, 12, 0, 0, 0, time.UTC).Format(time.RFC3339), out.Data.UploadedAt)

		// The presign request addressed the CALLER's folder — foreign ids are
		// unreachable by construction.
		e.Files.mu.Lock()
		last := e.Files.lastName
		e.Files.mu.Unlock()
		require.Equal(t, objectstore.UserFolder(testUID)+"/"+fileID, last)
	})

	t.Run("stat miss 404", func(t *testing.T) {
		e := newTestEnv(t, nil)
		e.Files.statExists = false
		rec := e.doJSON(t, http.MethodGet, "/api/files/"+fileID, e.token(t, testUID), nil)
		require.Equal(t, http.StatusNotFound, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "File not found", body["message"])
	})

	t.Run("path-shaped id rejected by pattern", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("storage must not be reached for hostile ids")
			return unexpectedOp(op)
		})
		for _, bad := range []string{"..%20etc%20passwd", "sub%2Fdir.txt"} {
			rec := e.doJSON(t, http.MethodGet, "/api/files/"+bad, e.token(t, testUID), nil)
			require.Equal(t, http.StatusNotFound, rec.Code, bad)
		}
	})

	t.Run("unauthenticated 401", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("auth must run before any storage call")
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodGet, "/api/files/"+fileID, "", nil)
		require.Equal(t, http.StatusUnauthorized, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Access denied. No token provided.", body["message"])
	})
}

func TestDeleteFile_RecordsOwnFolderKey(t *testing.T) {
	fileID := "3f2a-uuid.bin"
	e := newTestEnv(t, nil)

	rec := e.doJSON(t, http.MethodDelete, "/api/v1/files/"+fileID, e.token(t, testUID), nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var body map[string]any
	decodeJSON(t, rec, &body)
	require.Equal(t, "File deleted successfully", body["message"])

	require.Equal(t,
		[]string{objectstore.UserFolder(testUID) + "/" + fileID},
		e.Files.removed)
}

func TestCORSPreflight(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		t.Fatalf("preflight must short-circuit before handlers")
		return unexpectedOp(op)
	})

	req, err := http.NewRequest(http.MethodOptions, e.Server.URL+"/api/recipes/", nil)
	require.NoError(t, err)
	req.Header.Set("Origin", "http://localhost:3004")
	req.Header.Set("Access-Control-Request-Method", "POST")

	res, err := e.Server.Client().Do(req)
	require.NoError(t, err)
	defer res.Body.Close()
	require.Equal(t, http.StatusNoContent, res.StatusCode)
	require.Equal(t, "*", res.Header.Get("Access-Control-Allow-Origin"))
	require.Contains(t, res.Header.Get("Access-Control-Allow-Methods"), "POST")
}
