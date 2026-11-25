# ---- build stage ----
FROM golang:1.25-alpine AS build
WORKDIR /src

# Cache dependencies separately so source edits don't re-download modules.
COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- runtime stage ----
FROM alpine:3.20

# ca-certificates: outbound HTTPS when Hasura/MinIO endpoints use TLS.
# busybox (already present) supplies the wget used by the compose healthcheck.
RUN apk add --no-cache ca-certificates \
    && addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build /out/server /app/server

USER app
EXPOSE 3001
ENTRYPOINT ["/app/server"]
