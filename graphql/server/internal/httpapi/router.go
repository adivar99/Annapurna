package httpapi

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/adivar99/annapurna-server/internal/ai"
	"github.com/adivar99/annapurna-server/internal/auth"
	"github.com/adivar99/annapurna-server/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// FileStore is the slice of the MinIO-backed object store the file handlers
// need. Declared consumer-side so tests can fake storage without MinIO.
type FileStore interface {
	UploadUserFile(ctx context.Context, r io.Reader, size int64, contentType, userID, originalName string) (string, error)
	UploadPublicImage(ctx context.Context, r io.Reader, size int64, contentType, originalName string) (objectName, publicURL string, err error)
	StatPrivate(ctx context.Context, objectName string) (lastModified time.Time, exists bool, err error)
	PresignPrivate(ctx context.Context, objectName string, expiry time.Duration) (string, error)
	RemovePrivate(ctx context.Context, objectName string) error
}

// Handlers bundles every collaborator the HTTP surface needs. main.go builds
// one and hands it to NewRouter.
type Handlers struct {
	Signer    *auth.Signer
	UserStore *store.Users
	Recipes   *store.Recipes
	Saved     *store.Saved
	Chat      *store.Chat
	Files     FileStore
	AIService *ai.Service
	AIMock    bool // true when no usable OPENAI_API_KEY is configured
	// Gemini mints ephemeral Live API tokens for realtime voice. nil means
	// voice is unconfigured and /ai/realtime/session serves the mock fixture.
	Gemini *ai.GeminiClient
}

// NewRouter wires middleware and mounts every route group under BOTH /api and
// /api/v1, exactly like the Node server did. StripSlashes keeps the trailing
// slash in POST /recipes/ working (the frontend sends it).
func NewRouter(h *Handlers, logger *slog.Logger) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(requestLogger(logger))
	r.Use(securityHeaders)
	r.Use(corsPermissive)
	r.Use(maxBody(10 << 20)) // express.json({limit: '10mb'}) parity
	r.Use(middleware.StripSlashes)

	r.NotFound(notFoundHandler)
	r.MethodNotAllowed(methodNotAllowedHandler)

	r.Get("/health", handleHealth)
	r.Mount("/api", apiSubrouter(h))
	r.Mount("/api/v1", apiSubrouter(h))
	return r
}

func apiSubrouter(h *Handlers) http.Handler {
	r := chi.NewRouter()

	r.Route("/auth", func(r chi.Router) {
		r.Post("/signup", h.signup)
		r.Post("/register", h.signup) // long-standing alias
		r.Post("/login", h.login)
		r.Post("/logout", h.logout)
		r.With(h.requireAuth).Get("/me", h.me)
		r.With(h.requireAuth).Get("/me/save-recipe", h.savedRecipeIDs)
		r.With(h.requireAuth).Get("/me/saved-recipes", h.savedRecipes)
		r.With(h.requireAuth).Post("/me/save-recipe/{recipeId}", h.saveRecipe)
		r.With(h.requireAuth).Delete("/me/save-recipe/{recipeId}", h.unsaveRecipe)
	})

	r.Route("/recipes", func(r chi.Router) {
		r.Get("/", h.listRecipes)
		r.Get("/latest", h.latestRecipes)
		r.With(h.requireAuth).Post("/", h.createRecipe)
		r.With(h.requireAuth).Put("/{id}", h.updateRecipe)
		r.With(h.requireAuth).Delete("/{id}", h.deleteRecipe)
		r.Get("/{id}", h.getRecipe)
	})

	r.Route("/files", func(r chi.Router) {
		r.With(h.requireAuth).Post("/upload", h.uploadFile)
		r.With(h.requireAuth).Post("/upload-image", h.uploadImage)
		r.With(h.requireAuth).Get("/{fileId}", h.getFile)
		r.With(h.requireAuth).Delete("/{fileId}", h.deleteFile)
	})

	r.Route("/chat", func(r chi.Router) {
		r.With(h.requireAuth).Get("/sessions", h.listChatSessions)
		r.With(h.requireAuth).Post("/sessions", h.createChatSession)
		r.With(h.requireAuth).Get("/sessions/{id}", h.getChatSession)
		r.With(h.requireAuth).Delete("/sessions/{id}", h.deleteChatSession)
		r.With(h.requireAuth).Post("/sessions/{id}/messages", h.addChatMessage)
		r.With(h.requireAuth).Get("/recipe", h.chatSessionByRecipe)
	})

	r.Route("/ai", func(r chi.Router) {
		r.With(h.requireAuth).Post("/realtime/session", h.realtimeSession)
		// WebSocket proxy for the Live API. Browsers cannot set custom
		// headers on WebSocket, so the JWT arrives as ?authorization= and
		// stripLiveJWTQuery moves it into the header for requireAuth.
		r.With(stripLiveJWTQuery, h.requireAuth).Get("/realtime/ws", h.liveProxy)
		r.With(h.requireAuth).Post("/parse", h.parseRecipe)
		r.With(h.requireAuth).Post("/ask-recipe-question", h.askRecipeQuestion)
		r.With(h.requireAuth).Post("/analyze-recipe", h.analyzeRecipe)
	})

	return r
}

type identityKey struct{}

// stripLiveJWTQuery lifts the JWT from the ?authorization= query parameter
// (WebSocket clients cannot send headers) into the Authorization header so
// requireAuth runs unmodified. The query value is wiped from the RequestURI
// copy so the token is not logged by requestLogger.
func stripLiveJWTQuery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if token := r.URL.Query().Get("authorization"); token != "" {
			r.Header.Set("Authorization", "Bearer "+token)
			q := r.URL.Query()
			q.Del("authorization")
			r.URL.RawQuery = q.Encode()
		}
		next.ServeHTTP(w, r)
	})
}

// requireAuth verifies the Bearer token and stores the identity in context.
// Error bodies are unified on {"message"} (frontend reads message||error).
func (h *Handlers) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")

		switch {
		case header == "":
			Fail(w, http.StatusUnauthorized, "Access denied. No token provided.")
			return
		case !strings.HasPrefix(header, "Bearer "):
			Fail(w, http.StatusUnauthorized, "Access denied. Invalid token format.")
			return
		}

		token := header[len("Bearer "):]
		if token == "" {
			Fail(w, http.StatusUnauthorized, "Access denied. No token provided.")
			return
		}

		identity, err := h.Signer.Parse(token)
		if err != nil {
			Fail(w, http.StatusUnauthorized, "Access denied. Invalid or expired token.")
			return
		}

		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), identityKey{}, identity)))
	})
}

// userID returns the authenticated caller's id (requireAuth must have run).
func userID(r *http.Request) string {
	id, _ := r.Context().Value(identityKey{}).(auth.Identity)
	return id.UserID
}
