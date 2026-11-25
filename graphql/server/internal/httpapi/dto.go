package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// decodeBody decodes a JSON request body into v. An empty body behaves like
// express.json() did: treated as an empty object, so optional-field requests
// keep working.
func decodeBody(r *http.Request, v any) error {
	err := json.NewDecoder(r.Body).Decode(v)
	if errors.Is(err, io.EOF) {
		return nil
	}
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return errBodyTooLarge
		}
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	return nil
}

var errBodyTooLarge = errors.New("request body too large")

// ---- Auth payloads ----

type signupInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
	ImageURL string `json:"imageUrl"`
}

// unwrapActionInput supports both direct REST bodies ({...}) and Hasura
// Action envelopes ({input: {input: {...}}}), reproducing
// `req.body.input?.input || req.body` including its fallback quirk: an
// envelope whose inner input is missing/null falls back to the whole body.
func unwrapActionInput(body []byte) []byte {
	var outer map[string]json.RawMessage
	if json.Unmarshal(body, &outer) != nil {
		return body
	}
	envelope, ok := outer["input"]
	if !ok {
		return body
	}
	var inner map[string]json.RawMessage
	if json.Unmarshal(envelope, &inner) != nil {
		return body
	}
	nested, ok := inner["input"]
	if !ok || string(nested) == "null" {
		return body
	}
	return nested
}

// loginLookup returns the login identifier honoring the Node precedence:
// login || email || username, lowercased and trimmed.
type loginInput struct {
	Login    *string `json:"login"`
	Email    *string `json:"email"`
	Username *string `json:"username"`
	Password string  `json:"password"`
}

func (l *loginInput) lookup() string {
	for _, s := range []*string{l.Login, l.Email, l.Username} {
		if s != nil && *s != "" {
			return strings.ToLower(strings.TrimSpace(*s))
		}
	}
	return ""
}

// ---- Recipe payloads ----

// recipeIn accepts every alias the JS routes did. Numeric fields may arrive
// as JSON numbers or numeric strings (the DB round-trips them as numbers).
type recipeIn struct {
	Title        *string         `json:"title"`
	Description  *string         `json:"description"`
	Ingredients  json.RawMessage `json:"ingredients"`
	Instructions json.RawMessage `json:"instructions"`
	Steps        json.RawMessage `json:"steps"`
	PrepTime     json.RawMessage `json:"prep_time"`
	CookTime     json.RawMessage `json:"cook_time"`
	Servings     json.RawMessage `json:"servings"`
	Difficulty   *string         `json:"difficulty"`
	Cuisine      *string         `json:"cuisine"`
	Tags         json.RawMessage `json:"tags"`
	ImageUrl     *string         `json:"imageUrl"`
	Image_url    *string         `json:"image_url"`
}

// firstRaw picks the first non-null raw value (JS `a || b` for arrays).
func firstRaw(vals ...json.RawMessage) json.RawMessage {
	for _, v := range vals {
		if len(v) > 0 && string(v) != "null" {
			return v
		}
	}
	return nil
}

// firstString picks the first non-empty string (JS `a || b`).
func firstString(vals ...*string) *string {
	for _, s := range vals {
		if s != nil && *s != "" {
			return s
		}
	}
	return nil
}

// coerceInt mirrors strict parseInt: JSON numbers are taken as-is, numeric
// strings are parsed exactly (no prefix parsing like JS), anything else is a
// validation miss.
func coerceInt(raw json.RawMessage) (*int, bool) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, true // absent → caller applies default / skips
	}
	var n float64
	if err := json.Unmarshal(raw, &n); err == nil {
		i := int(n)
		return &i, true
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		if i, convErr := strconv.Atoi(s); convErr == nil {
			return &i, true
		}
	}
	return nil, false
}

// ---- Chat payloads ----

type chatSessionIn struct {
	RecipeID    *string `json:"recipe_id"`
	RecipeIDAlt *string `json:"recipeId"`
}

type chatMessageIn struct {
	Message *string `json:"message"`
	Text    *string `json:"text"`
	Sender  *string `json:"sender"`
}

func (m *chatMessageIn) content() string {
	for _, s := range []*string{m.Message, m.Text} {
		if s != nil && *s != "" {
			return *s
		}
	}
	return ""
}

// ---- AI payloads ----

type aiParseIn struct {
	RecipeText *string `json:"recipe_text"`
	Text       *string `json:"text"`
}

func (p *aiParseIn) rawText() string {
	for _, s := range []*string{p.RecipeText, p.Text} {
		if s != nil && *s != "" {
			return *s
		}
	}
	return ""
}

type aiAskIn struct {
	Recipe   json.RawMessage `json:"recipe"`
	Question json.RawMessage `json:"question"`
}

// questionString flattens the question field: JS accepted a string or an
// array of strings joined with spaces.
func (a *aiAskIn) questionString() string {
	if len(a.Question) == 0 || string(a.Question) == "null" {
		return ""
	}
	var single string
	if json.Unmarshal(a.Question, &single) == nil {
		return single
	}
	var list []string
	if json.Unmarshal(a.Question, &list) == nil {
		out := ""
		for i, q := range list {
			if i > 0 {
				out += " "
			}
			out += q
		}
		return out
	}
	return ""
}

// recipeField extracts a string property from the raw recipe object ("id",
// "title") returning "" when absent — JS falsy semantics then apply at call
// sites (`recipe.id || null`, `${recipe.title}`).
func recipeField(recipe json.RawMessage, key string) string {
	var m map[string]any
	if json.Unmarshal(recipe, &m) != nil {
		return ""
	}
	switch v := m[key].(type) {
	case string:
		return v
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	default:
		return ""
	}
}

// recipeProperty returns the raw value of a recipe property for template
// interpolation (nil when absent, mirroring JS undefined).
func recipeProperty(recipe json.RawMessage, key string) any {
	var m map[string]any
	if json.Unmarshal(recipe, &m) != nil {
		return nil
	}
	v, ok := m[key]
	if !ok {
		return nil
	}
	return v
}

// orUndefined renders a possibly-empty field like a JS template literal did:
// undefined becomes the literal text "undefined".
func orUndefined(s string) string {
	if s == "" {
		return "undefined"
	}
	return s
}

func firstNonNull(vals ...any) any {
	for _, v := range vals {
		if v != nil {
			return v
		}
	}
	return nil
}
