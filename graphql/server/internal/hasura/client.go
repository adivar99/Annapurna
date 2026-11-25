// Package hasura is the thin GraphQL client every store talks through. All
// database access flows through the Hasura admin endpoint, exactly as it did
// in the Node server — the Go service never talks to Postgres directly.
package hasura

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// Client posts GraphQL operations to the Hasura admin endpoint.
type Client struct {
	endpoint    string
	adminSecret string
	http        *http.Client
}

// NewClient builds a client. A nil httpClient gets a 10s timeout.
func NewClient(endpoint, adminSecret string, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}
	return &Client{endpoint: endpoint, adminSecret: adminSecret, http: httpClient}
}

// Error carries the first GraphQL error Hasura returned for an operation.
type Error struct {
	Message string
}

func (e *Error) Error() string { return e.Message }

type gqlRequest struct {
	Query     string `json:"query"`
	Variables any    `json:"variables"`
}

type gqlResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// Exec runs operation with variables and decodes the data payload into out.
// out may be nil to discard it. A GraphQL-level failure becomes *Error; a
// transport or decode failure is wrapped with context.
func (c *Client) Exec(ctx context.Context, operation string, variables any, out any) error {
	body, err := json.Marshal(gqlRequest{Query: operation, Variables: variables})
	if err != nil {
		return fmt.Errorf("encode graphql request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-hasura-admin-secret", c.adminSecret)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("hasura request failed: %w", err)
	}
	defer resp.Body.Close()

	var decoded gqlResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return fmt.Errorf("decode hasura response (status %d): %w", resp.StatusCode, err)
	}
	if len(decoded.Errors) > 0 {
		slog.Error("hasura graphql error", "op", operationName(operation), "errors", decoded.Errors)
		return &Error{Message: decoded.Errors[0].Message}
	}
	if out != nil && len(decoded.Data) > 0 {
		return json.Unmarshal(decoded.Data, out)
	}
	return nil
}

// operationName digs the operation name out of a document for log lines.
func operationName(doc string) string {
	for _, keyword := range []string{"query ", "mutation "} {
		i := strings.Index(doc, keyword)
		if i < 0 {
			continue
		}
		rest := strings.TrimSpace(doc[i+len(keyword):])
		if j := strings.IndexAny(rest, " (\n{"); j > 0 {
			return rest[:j]
		}
	}
	return "unknown"
}
