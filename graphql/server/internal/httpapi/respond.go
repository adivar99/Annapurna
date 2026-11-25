// Package httpapi holds the HTTP surface: routing, middleware, and the five
// handler groups (auth, recipes, chat, ai, files).
package httpapi

import (
	"encoding/json"
	"net/http"
)

// WriteJSON serializes v with a status code. Nil values render as a literal
// JSON `null` body (GET /chat/recipe relies on this, matching Node's
// res.json(null)).
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false) // JSON.stringify does not escape <, >, &
	if v == nil {
		_, _ = w.Write([]byte("null"))
		return
	}
	_ = enc.Encode(v)
}

// Fail writes the unified error envelope: {"message": "..."}. The frontend
// reads errorData.message || errorData.error, so unifying on message is safe.
func Fail(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]any{"message": message})
}

// notFoundHandler and methodNotAllowedHandler give 404/405 responses JSON
// bodies like Express did.
func notFoundHandler(w http.ResponseWriter, _ *http.Request) {
	Fail(w, http.StatusNotFound, "Not found")
}

func methodNotAllowedHandler(w http.ResponseWriter, _ *http.Request) {
	Fail(w, http.StatusMethodNotAllowed, "Method not allowed")
}
