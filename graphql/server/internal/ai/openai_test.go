package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// fakeOpenAI captures the incoming request and answers with one canned choice.
func fakeOpenAI(t *testing.T, captured *map[string]any, headers map[string]string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		for k, want := range headers {
			if got := r.Header.Get(k); got != want {
				t.Errorf("header %s = %q, want %q", k, got, want)
			}
		}
		body, _ := io.ReadAll(r.Body)
		if captured != nil {
			if err := json.Unmarshal(body, captured); err != nil {
				t.Errorf("decode request body: %v", err)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"choices":[{"message":{"role":"assistant","content":"canned"}}]}`)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestAskQuestionOpenRouter(t *testing.T) {
	var body map[string]any
	srv := fakeOpenAI(t, &body, map[string]string{
		"Authorization": "Bearer sk-or-test",
		"HTTP-Referer":  "http://localhost:3004",
		"X-Title":       "Annapurna",
	})

	s := NewCompatibleService("sk-or-test", "https://openrouter.ai/api/v1", "anthropic/claude-haiku-5.5", "http://localhost:3004", "Annapurna")
	s.baseURL = srv.URL // keep openrouter sniffing, but hit the fake server
	reply, err := s.AskQuestion(context.Background(), "system", "how do I boil water?")
	if err != nil {
		t.Fatalf("AskQuestion: %v", err)
	}
	if reply != "canned" {
		t.Fatalf("reply = %q", reply)
	}
	if got := body["model"]; got != "anthropic/claude-haiku-5.5" {
		t.Errorf("model = %v", got)
	}
	if _, ok := body["provider"]; ok {
		t.Error("ask request should not carry provider preferences")
	}
}

func TestParseRecipeOpenRouterIncludesRequireParameters(t *testing.T) {
	var body map[string]any
	srv := fakeOpenAI(t, &body, nil)

	s := NewCompatibleService("sk-or-test", "https://openrouter.ai/api/v1", "anthropic/claude-haiku-5.5", "", "Annapurna")
	s.baseURL = srv.URL
	if _, err := s.ParseRecipe(context.Background(), "2 cups flour"); err != nil {
		t.Fatalf("ParseRecipe: %v", err)
	}
	provider, ok := body["provider"].(map[string]any)
	if !ok {
		t.Fatalf("provider block missing: %v", body["provider"])
	}
	if provider["require_parameters"] != true {
		t.Errorf("require_parameters = %v", provider["require_parameters"])
	}
}

func TestParseRecipeOpenAINoProviderBlock(t *testing.T) {
	var body map[string]any
	srv := fakeOpenAI(t, &body, nil)

	s := NewCompatibleService("sk-test", srv.URL, "gpt-4o-mini", "", "")
	if _, err := s.ParseRecipe(context.Background(), "2 cups flour"); err != nil {
		t.Fatalf("ParseRecipe: %v", err)
	}
	if _, ok := body["provider"]; ok {
		t.Error("plain OpenAI request must not carry a provider block")
	}
	if got := body["model"]; got != "gpt-4o-mini" {
		t.Errorf("model = %v", got)
	}
}
