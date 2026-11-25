// Package ai implements the OpenAI-backed endpoints: ephemeral realtime
// session keys, recipe parsing, Q&A, and analysis. When no usable API key is
// configured the handlers fall back to offline fixtures (mock.go), matching
// the Node behavior.
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	apiBaseURL    = "https://api.openai.com/v1"
	realtimeModel = "gpt-4o-realtime-preview-2024-12-17"
	chatModel     = "gpt-4o-mini"
)

// Service calls the OpenAI REST API. Only net/http is used — the four calls
// here don't justify an SDK dependency.
type Service struct {
	apiKey string
	http   *http.Client
}

func NewService(apiKey string) *Service {
	return &Service{apiKey: apiKey, http: &http.Client{Timeout: 60 * time.Second}}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// RealtimeSession mints an ephemeral client secret for browser voice
// sessions, unwrapping either response shape OpenAI has used.
func (s *Service) RealtimeSession(ctx context.Context) (string, error) {
	body, _ := json.Marshal(map[string]any{"model": realtimeModel, "voice": "onyx"})
	var out struct {
		ClientSecret json.RawMessage `json:"client_secret"`
	}
	if err := s.post(ctx, "/realtime/sessions", body, &out); err != nil {
		return "", err
	}
	return unwrapClientSecret(out.ClientSecret)
}

func unwrapClientSecret(raw json.RawMessage) (string, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return "", fmt.Errorf("openai response missing client_secret")
	}
	var nested struct {
		Value *string `json:"value"`
	}
	if json.Unmarshal(raw, &nested) == nil && nested.Value != nil {
		return *nested.Value, nil
	}
	var plain string
	if err := json.Unmarshal(raw, &plain); err != nil {
		return "", fmt.Errorf("unrecognized client_secret format: %w", err)
	}
	return plain, nil
}

// ParseRecipe sends raw recipe text through a strict-schema completion and
// returns the model's JSON payload untouched.
func (s *Service) ParseRecipe(ctx context.Context, recipeText string) (json.RawMessage, error) {
	requestBody := map[string]any{
		"model": chatModel,
		"response_format": map[string]any{
			"type":        "json_schema",
			"json_schema": json.RawMessage(recipeParserSchema),
		},
		"messages": []chatMessage{
			{Role: "system", Content: parserSystemPrompt},
			{Role: "user", Content: recipeText},
		},
	}
	content, err := s.chatCompletion(ctx, requestBody)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(content), nil
}

// AskQuestion answers a question about a recipe with the Anu persona prompt.
func (s *Service) AskQuestion(ctx context.Context, systemPrompt, question string) (string, error) {
	requestBody := map[string]any{
		"model": chatModel,
		"messages": []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: question},
		},
	}
	return s.chatCompletion(ctx, requestBody)
}

// Analyze asks for a short nutritional/culinary analysis; user content is the
// serialized recipe.
func (s *Service) Analyze(ctx context.Context, recipeJSON string) (string, error) {
	requestBody := map[string]any{
		"model": chatModel,
		"messages": []chatMessage{
			{Role: "system", Content: analyzeSystemPrompt},
			{Role: "user", Content: recipeJSON},
		},
	}
	return s.chatCompletion(ctx, requestBody)
}

// chatCompletion posts a request and extracts choices[0].message.content.
func (s *Service) chatCompletion(ctx context.Context, requestBody any) (string, error) {
	body, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("encode openai request: %w", err)
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := s.post(ctx, "/chat/completions", body, &out); err != nil {
		return "", err
	}
	if len(out.Choices) == 0 {
		return "", fmt.Errorf("openai returned no choices")
	}
	return out.Choices[0].Message.Content, nil
}

func (s *Service) post(ctx context.Context, path string, body []byte, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiBaseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	payload, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("read openai response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("openai returned status %d: %s", resp.StatusCode, truncateForLog(payload))
	}
	if err := json.Unmarshal(payload, out); err != nil {
		return fmt.Errorf("decode openai response: %w", err)
	}
	return nil
}

func truncateForLog(b []byte) string {
	const max = 512
	if len(b) > max {
		return string(b[:max]) + "…"
	}
	return string(b)
}
