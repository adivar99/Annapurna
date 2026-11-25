package httpapi

import (
	"net/http"
	"time"
)

// handleHealth reports liveness with an ISO timestamp like Date#toISOString
// produced (millisecond precision, Z suffix).
func handleHealth(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"status":    "OK",
		"timestamp": time.Now().UTC().Format("2006-01-02T15:04:05.000Z07:00"),
	})
}
