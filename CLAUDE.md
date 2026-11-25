# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Annapurna is a web application structured as a multi-service stack orchestrating a frontend client, a Go REST API server, Hasura GraphQL engine, PostgreSQL database, and MinIO object storage.

### Services and Components

- **Frontend (`frontend/annapurna-app`)**: Next.js 16 (React 19, TypeScript, Tailwind CSS v4) application for user authentication and recipe browsing/management.
- **Backend API & File Service (`graphql/server`)**: Go service (stdlib `net/http` + chi router) providing:
  - Authentication endpoints (`/api/auth/signup`, `/api/auth/login`) with JWT token generation and bcrypt password hashing
  - Recipe, chat-session, and AI helper endpoints under `/api` (and `/api/v1`); all database access proxied through Hasura's admin GraphQL endpoint — no direct Postgres connection
  - MinIO file management (`/api/files/upload`, `/api/files/:fileId`) with presigned URL generation and access control
- **GraphQL Engine (`hasura/graphql-engine:v2.46.0`)**: Interfaces with PostgreSQL (`pg_db`) and exposes GraphQL queries/mutations with role-based authorization.
- **Database (`postgres:15`)**: Stores application data and Hasura metadata.
- **Storage (`minio`)**: S3-compatible object storage managing public (`public-images`) and private (`user-files`) buckets.

### Data & Authentication Flow

1. **Auth & Tokens**: The Go server handles authentication and issues JWT tokens signed with `HASURA_GRAPHQL_JWT_SECRET` containing Hasura claims (`x-hasura-default-role`, `x-hasura-user-id`, `x-hasura-allowed-roles`).
2. **GraphQL Operations**: Frontend sends queries/mutations to Hasura using the JWT token; Hasura enforces permission rules on PostgreSQL tables.
3. **File Management**: Direct Hasura cannot generate MinIO presigned URLs; uploads and downloads route through the Go API layer (`/api/files`). Presigned links are signed against the browser-facing host (`MINIO_PUBLIC_URL`) because S3 signatures cover the Host header.

---

## Common Commands & Workflows

### Docker Management (`scripts/annapurna.sh`)

A helper script `annapurna.sh` (symlinked at root) wraps Docker Compose workflows and automatically manages Hasura metadata:

```bash
# Build services
./annapurna.sh build baseimgs  # Build base images (in baseimgs/)
./annapurna.sh build dev       # Build development images
./annapurna.sh build backend   # Build only the Go backend image (compose service stays named "express")
./annapurna.sh build frontend  # Build only the frontend image

# Start / Stop stack
./annapurna.sh start dev       # Start all containers & automatically reload Hasura metadata
./annapurna.sh stop            # Export Hasura metadata to graphql/metadata/ & stop containers

# Logs & Shell access
./annapurna.sh logs            # Follow logs for all services
./annapurna.sh logs <service>  # Follow logs for a specific service (e.g., express, frontend)
./annapurna.sh shell <service> <command> # Execute shell command inside container
```

### Next.js Frontend (`frontend/annapurna-app`)

Run inside `frontend/annapurna-app`:

```bash
npm install                    # Install dependencies
npm run dev                    # Start local Next.js dev server (port 3000)
npm run build                  # Build production bundle
npm run lint                   # Run ESLint checks
```

### Go Server (`graphql/server`)

Run inside `graphql/server`:

```bash
go run ./cmd/server            # Start locally (reads graphql/server/.env)
go build ./cmd/server          # Build binary
go test ./...                  # Run unit tests
go vet ./...                   # Static checks

# Without a local Go toolchain, run anything through Docker:
docker run --rm -v "$PWD:/src" -v annapurna-gomodcache:/go/pkg/mod \
  -w /src golang:1.25-alpine sh -c "go test ./..."
```

---

## Service Endpoints & Ports

When running the full stack with Docker Compose:

| Service | Port | Description |
| :--- | :--- | :--- |
| **Frontend** | `http://localhost:3004` | Next.js Web UI (mapped to container port 3000) |
| **Express API** | `http://localhost:3001` | Go backend: Auth, Recipes, Chat, AI & File Upload API |
| **Hasura GraphQL Engine** | `http://localhost:8080` | GraphQL Endpoint & Hasura Console |
| **MinIO API** | `http://localhost:9000` | S3 API endpoint |
| **MinIO Console** | `http://localhost:9001` | Web UI for bucket and object management |
| **PostgreSQL** | `localhost:5432` | Postgres database (`pg_db`) |
| **Data Connector Agent** | `http://localhost:8082` | Hasura Data Connector Agent |

---

## Environment Configuration

- `.env`: Root environment configuration used by `docker-compose.yml` and startup scripts.
- `graphql/server/.env`: Backend environment variables (JWT secrets, Hasura endpoint, MinIO credentials; see `graphql/server/.env.example`).
