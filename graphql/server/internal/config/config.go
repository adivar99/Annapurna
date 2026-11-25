// Package config loads server configuration from the process environment,
// optionally seeded from a local .env file (a dev convenience so
// `go run ./cmd/server` behaves like the Node server did; container
// deployments receive their environment from docker-compose instead).
//
// Variable names are unchanged from the Node server; NODE_ENV is accepted but
// ignored beyond logging.
package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config carries every external setting the server needs.
type Config struct {
	Port string
	Env  string

	Hasura    Hasura
	JWT       JWT
	MinIO     MinIO
	OpenAIKey string
}

type Hasura struct {
	Endpoint    string
	AdminSecret string
}

type JWT struct {
	Secret    string
	ExpiresIn string
}

type MinIO struct {
	Endpoint  string
	Port      int
	UseSSL    bool
	AccessKey string
	SecretKey string
	// PublicURL is the base URL browsers use to reach MinIO
	// (e.g. http://localhost:9000). Presigned URLs are signed against this
	// host because the signature covers the Host header. Falls back to
	// Endpoint:Port when unset.
	PublicURL string
}

// Load reads configuration from the environment, applying the same defaults
// the Node server had.
func Load() Config {
	_ = godotenv.Load()

	return Config{
		Port: getenv("PORT", "3001"),
		Env:  getenv("NODE_ENV", "development"),
		Hasura: Hasura{
			Endpoint:    getenv("HASURA_ENDPOINT", "http://annapurna_hasura:8080/v1/graphql"),
			AdminSecret: getenv("HASURA_GRAPHQL_ADMIN_SECRET", "myadminsecretkey"),
		},
		JWT: JWT{
			Secret:    getenv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production"),
			ExpiresIn: getenv("JWT_EXPIRES_IN", "24h"),
		},
		MinIO: MinIO{
			Endpoint:  getenv("MINIO_ENDPOINT", "localhost"),
			Port:      intFromEnv("MINIO_PORT", 9000),
			UseSSL:    getenv("MINIO_USE_SSL", "false") == "true",
			AccessKey: getenv("MINIO_ACCESS_KEY", "minioadmin"),
			SecretKey: getenv("MINIO_SECRET_KEY", "minioadmin123"),
			PublicURL: getenv("MINIO_PUBLIC_URL", ""),
		},
		OpenAIKey: getenv("OPENAI_API_KEY", ""),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func intFromEnv(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
