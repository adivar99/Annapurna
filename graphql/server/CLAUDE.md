# CLAUDE.md

This file provides guidance to Claude Code when working with code in this directory.

## Overview

Go backend for the Annapurna recipe app (module `github.com/adivar99/annapurna-server`). Serves auth, recipes, chat, AI helper, and MinIO file endpoints over REST. **All database access is proxied through Hasura's admin GraphQL endpoint — this service never connects to Postgres directly.**

Compose service note: this server runs as the `express` service in docker-compose (the name is historical); build it with `./annapurna.sh build backend` from the repo root.

## Common Commands

```bash
go run ./cmd/server            # Start locally (reads graphql/server/.env)
go build ./cmd/server          # Build binary
go test ./...                  # Run unit tests
go vet ./...                   # Static checks

# Without a local Go toolchain, run anything through Docker:
docker run --rm -v "$PWD:/src" -v annapurna-gomodcache:/go/pkg/mod \
  -w /src golang:1.25-alpine sh -c "go test ./..."
```

## Architecture

### Layout

```
cmd/server/            entrypoint: config load, wiring, graceful shutdown
internal/config/       env parsing (optionally seeded from .env)
internal/auth/         JWT signer/parser, bcrypt hashing, TTL parsing
internal/hasura/       GraphQL client + verbatim operation documents
internal/store/        typed wrappers around each Hasura operation
                       (users, recipes, saved_recipes, chat)
internal/objectstore/  MinIO buckets, uploads, presigned URLs, deletes
internal/ai/           OpenAI calls + offline mock fixtures
internal/httpapi/      routing, middleware, handlers, request/response DTOs
```

### HTTP Surface

- `internal/httpapi/router.go` mounts every route group under **both** `/api` and `/api/v1` (compat with the old Node server).
- Stack: `net/http` + chi router; middleware for `log/slog` logging, security headers, permissive CORS, and a 10 MB body limit.
- Key endpoints: `/api/auth/signup`, `/api/auth/login`, `/api/recipes/*`, `/api/chat/*`, `/api/ai/*`, `/api/files/upload`, `/api/files/:fileId`, `/health`.
- `Handler.RequireAuth` middleware parses the JWT and rejects unauthenticated requests.

### Key Invariants

- **JWT**: HS256 via `golang-jwt/v5`; claims go in the `https://hasura.io/jwt/claims` block. `JWT_SECRET` must be byte-identical to Hasura's `HASURA_GRAPHQL_JWT_SECRET.key` or every token is rejected by the engine.
- **Passwords**: bcrypt at cost 12 — hashes remain compatible with bcryptjs hashes already in the database.
- **MinIO presigning**: S3 signatures cover the `Host` header, so presigned download links are signed against the browser-facing host (`MINIO_PUBLIC_URL`), not the internal `minio` endpoint. Two clients are used: data-plane (internal) + presign-only (public URL).
- **Hasura access**: queries/mutations live as verbatim operation documents in `internal/hasura/` and are wrapped by typed helpers in `internal/store/`. New DB operations follow that pattern; no raw SQL anywhere.
- **AI routes**: when `OPENAI_API_KEY` is empty, `/api/ai/*` serves canned fixtures from `internal/ai/mock.go` instead of calling OpenAI.

## Environment Configuration

Loads from the process environment, with a `.env` file fallback for local runs (copy `.env.example` to `.env`). Notable variables:

| Variable | Purpose |
| :-- | :-- |
| `PORT` | HTTP listen port (3001) |
| `HASURA_ENDPOINT` / `HASURA_GRAPHQL_ADMIN_SECRET` | Hasura admin endpoint & secret (in Docker: `http://graphql-engine:8080/v1/graphql`) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Token signing; must match Hasura's JWT secret key |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Internal MinIO data-plane connection |
| `MINIO_PUBLIC_URL` | Browser-facing base URL used to sign presigned downloads |
| `OPENAI_API_KEY` | Empty = offline mock fixtures for `/api/ai/*` |

## Testing

Unit tests live alongside the code (`*_test.go` in `internal/`), using `stretchr/testify`. Tests in `internal/httpapi/` use table-driven handlers tests with mocked `internal/hasura` and `internal/objectstore` collaborators — no network access is required to run `go test ./...`.
