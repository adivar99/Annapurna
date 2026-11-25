# Annapurna Server

Go backend for the Annapurna recipe app. Serves authentication, recipe
management, chat sessions, AI helper endpoints, and MinIO file management over
REST. All database access goes through the Hasura GraphQL engine's admin API —
this service never touches Postgres directly.

## Stack

- **net/http + [chi](https://github.com/go-chi/chi)** router with middleware for logging (`log/slog`), security headers, permissive CORS, and a 10 MB body limit.
- **golang-jwt/v5** issues HS256 tokens whose claims match what Hasura expects (`https://hasura.io/jwt/claims` block).
- **golang.org/x/crypto/bcrypt** at cost 12; hashes remain compatible with the bcryptjs hashes already in the database.
- **minio-go/v7** with two clients: a data-plane client pointed at the internal endpoint and a presign-only client signed against the browser-facing host (`MINIO_PUBLIC_URL`), because S3 signatures cover the Host header.

## Layout

```
cmd/server/        entrypoint: config load, wiring, graceful shutdown
internal/config/   env parsing (optionally seeded from .env)
internal/auth/     JWT signer/parser, password hashing, TTL parsing
internal/hasura/   GraphQL client + verbatim operation documents
internal/store/    typed wrappers around each Hasura operation (users,
                   recipes, saved_recipes, chat)
internal/objectstore/  MinIO buckets, uploads, presigned URLs, deletes
internal/ai/       OpenAI calls + offline mock fixtures
internal/httpapi/  routing, middleware, handlers, request/response DTOs
```

## Running

```bash
run locally:               go run ./cmd/server        # reads graphql/server/.env
build binary:              go build ./cmd/server
run tests:                 go test ./...
vet:                       go vet ./...

# No Go toolchain installed? Everything works through Docker:
docker run --rm -v "$PWD:/src" -v annapurna-gomodcache:/go/pkg/mod \
  -w /src golang:1.25-alpine sh -c "go test ./..."
```

In the full stack the server runs as the `express` compose service:

```bash
./annapurna.sh build backend && ./annapurna.sh start dev
```

## Configuration

Reads environment variables (with `.env` fallback for local runs); copy
`.env.example` to `.env` to get started. Notable entries:

| Variable | Default | Purpose |
| :-- | :-- | :-- |
| `PORT` | `3001` | HTTP listen port |
| `HASURA_ENDPOINT` | `http://annapurna_hasura:8080/v1/graphql` | Hasura admin GraphQL endpoint |
| `HASURA_GRAPHQL_ADMIN_SECRET` | `myadminsecretkey` | Admin secret sent as `x-hasura-admin-secret` |
| `JWT_SECRET` | dev placeholder | Must byte-match Hasura's `HASURA_GRAPHQL_JWT_SECRET.key` |
| `JWT_EXPIRES_IN` | `24h` | Token lifetime (`24h`, `7d`, or seconds) |
| `MINIO_ENDPOINT` / `MINIO_PORT` | `localhost` / `9000` | Internal MinIO data-plane endpoint |
| `MINIO_USE_SSL` | `false` | TLS toward MinIO |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | dev placeholders | MinIO credentials |
| `MINIO_PUBLIC_URL` | falls back to `MINIO_ENDPOINT:PORT` | Browser-facing base URL; presigned links are signed against this host |
| `OPENAI_API_KEY` | _(empty)_ | Empty (or the historical placeholder value) switches the `/api/ai/*` routes to canned mock responses |

## API surface

Every route group is mounted under both `/api` and `/api/v1`:

- `POST /auth/signup` (`/register` alias), `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET|PUT|DELETE /auth/me/save-recipe[...]` — saved-bookmark endpoints
- `GET /recipes`, `GET /recipes/latest`, `GET /recipes/:id`, `POST|PUT|DELETE /recipes[...]` (owner-checked mutations)
- `POST /files/upload` (private per-user objects), `POST /files/upload-image` (public bucket), `GET|DELETE /files/:fileId` (presigned downloads within the caller's own folder)
- `GET|POST /chat/sessions`, `GET|DELETE /chat/sessions/:id`, `POST /chat/sessions/:id/messages`, `GET /chat/recipe?recipe_id=...`
- `POST /ai/realtime/session`, `/ai/parse`, `/ai/ask-recipe-question`, `/ai/analyze-recipe` (mock fixtures without an API key)
- `GET /health`

Design notes on response fidelity (the port from Express preserved wire
behavior deliberately, including a few quirks): JSON responses keep Hasura's
field names, empty lists marshal as `[]` rather than `null`, timestamps pass
through as raw strings, and error bodies use a unified `{"message": ...}`
envelope that the frontend reads via `errorData.message || errorData.error`.
