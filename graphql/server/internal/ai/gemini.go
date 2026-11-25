package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Gemini Live API endpoints and defaults. Voice sessions are Gemini-specific:
// the browser connects straight to Google's BidiGenerateContent WebSocket with
// an ephemeral token, so this client only talks to the token-minting endpoint
// and ignores the configurable OpenAI-compatible base URL.
const (
	geminiAPIBaseURL = "https://generativelanguage.googleapis.com"
	// DefaultLiveModel is the Live API model the ephemeral token locks the
	// browser session to (overridable via GEMINI_LIVE_MODEL).
	DefaultLiveModel = "gemini-3.8-live"

	// Token lifetimes per Google's docs: a new session must start within
	// newSessionExpireTime, and messages can flow for expireTime.
	geminiNewSessionTTL = 2 * time.Minute
	geminiTokenTTL      = 30 * time.Minute
)

// GeminiClient mints ephemeral Live API tokens for browser voice sessions.
// A nil *GeminiClient means voice is unconfigured; handlers then serve the
// offline mock fixture.
type GeminiClient struct {
	apiKey  string
	model   string
	baseURL string
	http    *http.Client
}

// NewGeminiClient returns nil when apiKey is empty, signaling that realtime
// voice is not configured (the handler falls back to the mock fixture).
func NewGeminiClient(apiKey, model string) *GeminiClient {
	if apiKey == "" {
		return nil
	}
	if model == "" {
		model = DefaultLiveModel
	}
	return &GeminiClient{
		apiKey:  apiKey,
		model:   model,
		baseURL: geminiAPIBaseURL,
		http:    &http.Client{Timeout: 15 * time.Second},
	}
}

// APIKey exposes the configured Gemini key for the WebSocket proxy (the
// proxy dials Google with raw-key auth because ephemeral-token sessions
// are service-gated for some keys).
func (g *GeminiClient) APIKey() string {
	if g == nil {
		return ""
	}
	return g.apiKey
}

// BaseURLForTest redirects token minting at a test server.
func (g *GeminiClient) BaseURLForTest(url string) { g.baseURL = url }

// Model reports the Live API model new tokens are locked to.
func (g *GeminiClient) Model() string {
	if g == nil || g.model == "" {
		return DefaultLiveModel
	}
	return g.model
}

// EphemeralToken mints a single-use browser token for the Live API. The
// client supplies the model and system instruction during WebSocket setup
// (the raw auth_tokens endpoint accepts no liveConnectConstraints field —
// that locking shape is SDK-only). The returned expiry is unix seconds of
// the token's expireTime (how long messages may flow over the connection).
func (g *GeminiClient) EphemeralToken(ctx context.Context) (token string, expiresAt int64, err error) {
	now := time.Now().UTC()
	requestBody := map[string]any{
		"uses":                 1,
		"expireTime":           now.Add(geminiTokenTTL).Format(time.RFC3339),
		"newSessionExpireTime": now.Add(geminiNewSessionTTL).Format(time.RFC3339),
	}
	body, err := json.Marshal(requestBody)
	if err != nil {
		return "", 0, fmt.Errorf("encode gemini token request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.baseURL+"/v1beta/auth_tokens", bytes.NewReader(body))
	if err != nil {
		return "", 0, err
	}
	req.Header.Set("x-goog-api-key", g.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.http.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("gemini token request failed: %w", err)
	}
	defer resp.Body.Close()

	payload, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", 0, fmt.Errorf("read gemini token response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", 0, fmt.Errorf("gemini returned status %d: %s", resp.StatusCode, truncateForLog(payload))
	}

	var out struct {
		Name       string `json:"name"`
		ExpireTime string `json:"expireTime"`
	}
	if err := json.Unmarshal(payload, &out); err != nil {
		return "", 0, fmt.Errorf("decode gemini token response: %w", err)
	}
	if strings.TrimSpace(out.Name) == "" {
		return "", 0, fmt.Errorf("gemini token response missing name")
	}

	expiresAt = now.Add(geminiTokenTTL).Unix()
	if t, err := time.Parse(time.RFC3339, out.ExpireTime); err == nil {
		expiresAt = t.Unix()
	}
	return out.Name, expiresAt, nil
}
