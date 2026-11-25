// Command server runs the Annapurna API: auth, recipes, chat, AI, and file
// endpoints, backed by Hasura (data), MinIO (objects), and OpenAI (AI).
package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/adivar99/annapurna-server/internal/ai"
	"github.com/adivar99/annapurna-server/internal/auth"
	"github.com/adivar99/annapurna-server/internal/config"
	"github.com/adivar99/annapurna-server/internal/hasura"
	"github.com/adivar99/annapurna-server/internal/httpapi"
	"github.com/adivar99/annapurna-server/internal/objectstore"
	"github.com/adivar99/annapurna-server/internal/store"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	slog.SetDefault(logger)

	cfg := config.Load()

	signer, err := auth.NewSigner(cfg.JWT.Secret, cfg.JWT.ExpiresIn)
	if err != nil {
		logger.Error("invalid JWT_EXPIRES_IN", "err", err)
		os.Exit(1)
	}

	hasuraClient := hasura.NewClient(cfg.Hasura.Endpoint, cfg.Hasura.AdminSecret, nil)

	objStore, err := objectstore.New(
		cfg.MinIO.Endpoint, cfg.MinIO.Port, cfg.MinIO.UseSSL,
		cfg.MinIO.AccessKey, cfg.MinIO.SecretKey, cfg.MinIO.PublicURL,
	)
	if err != nil {
		logger.Error("invalid MinIO configuration", "err", err)
		os.Exit(1)
	}

	handlers := &httpapi.Handlers{
		Signer:    signer,
		UserStore: store.NewUsers(hasuraClient),
		Recipes:   store.NewRecipes(hasuraClient),
		Saved:     store.NewSaved(hasuraClient),
		Chat:      store.NewChat(hasuraClient),
		Files:     objStore,
		AIService: ai.NewService(cfg.OpenAIKey),
		AIMock:    ai.IsMockKey(cfg.OpenAIKey),
	}

	srv := &http.Server{
		Addr:        ":" + cfg.Port,
		Handler:     httpapi.NewRouter(handlers, logger),
		ReadTimeout: 15 * time.Second, WriteTimeout: 60 * time.Second, IdleTimeout: 120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("🚀 Server running on http://localhost:" + cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server failed", "err", err)
			stop()
		}
	}()

	// Bucket bootstrap stays warn-not-fatal: the Node server tolerated MinIO
	// being unavailable in standalone local dev and retried nothing.
	if err := objStore.EnsureBuckets(ctx); err != nil {
		logger.Warn("MinIO bucket initialization warning (MinIO might be unavailable in local standalone dev)", "err", err)
	}
	logger.Info("presigned URLs will be signed for host " + presignHost(cfg))

	<-ctx.Done()
	logger.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "err", err)
	}
}

func presignHost(cfg config.Config) string {
	if cfg.MinIO.PublicURL != "" {
		return cfg.MinIO.PublicURL
	}
	return net.JoinHostPort(cfg.MinIO.Endpoint, strconv.Itoa(cfg.MinIO.Port))
}
