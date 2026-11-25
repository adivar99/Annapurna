package httpapi

import (
	"bufio"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
)

// securityHeaders sets the helmet-subset headers the API shipped with (helmet
// ran with contentSecurityPolicy disabled).
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "SAMEORIGIN")
		h.Set("Strict-Transport-Security", "max-age=15552000; includeSubDomains")
		h.Set("X-DNS-Prefetch-Control", "off")
		next.ServeHTTP(w, r)
	})
}

// corsPermissive mirrors the Node server's bare `cors()` defaults:
// Access-Control-Allow-Origin *, standard method list, requested headers
// echoed back, preflight answered 204 before any auth runs.
func corsPermissive(next http.Handler) http.Handler {
	const allowMethods = "GET,HEAD,PUT,PATCH,POST,DELETE"
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", "*")
		h.Add("Vary", "Origin")

		if r.Method == http.MethodOptions {
			h.Set("Access-Control-Allow-Methods", allowMethods)
			if requested := r.Header.Get("Access-Control-Request-Headers"); requested != "" {
				h.Set("Access-Control-Allow-Headers", requested)
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// maxBody caps request body size like express.json({limit}) did. Oversized
// bodies are rejected with a generic 400; the multipart handlers enforce
// their own limit with the upload-specific message on top of this.
func maxBody(n int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, n)
			next.ServeHTTP(w, r)
		})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (rec *statusRecorder) WriteHeader(status int) {
	rec.status = status
	rec.ResponseWriter.WriteHeader(status)
}

// Hijack forwards the connection upgrade so WebSocket endpoints under the
// logger keep working (gorilla's Upgrade requires http.Hijacker).
func (rec *statusRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hj, ok := rec.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("underlying ResponseWriter does not implement http.Hijacker")
	}
	rec.status = http.StatusSwitchingProtocols
	return hj.Hijack()
}

// requestLogger emits one structured line per request for ./annapurna.sh logs.
func requestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			logger.Info("request",
				"method", r.Method,
				"path", strings.Clone(r.URL.Path),
				"status", rec.status,
			)
		})
	}
}
