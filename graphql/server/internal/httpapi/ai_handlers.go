package httpapi

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/adivar99/annapurna-server/internal/ai"
)

// aiError writes the AI route error shape: {"message": ..., "error": ...}.
func aiError(w http.ResponseWriter, message string, err error) {
	WriteJSON(w, http.StatusInternalServerError, map[string]any{
		"message": message,
		"error":   err.Error(),
	})
}

// realtimeSession mints an ephemeral Live API token for the browser voice
// session. Without a Gemini key (or under the mock sentinel) it answers from
// a fixture, matching the offline behavior of the other AI routes.
func (h *Handlers) realtimeSession(w http.ResponseWriter, r *http.Request) {
	if h.Gemini == nil {
		WriteJSON(w, http.StatusOK, map[string]any{
			"client_secret": ai.MockClientSecret,
			"expires_at":    time.Now().Unix() + 3600,
		})
		return
	}

	token, expiresAt, err := h.Gemini.EphemeralToken(r.Context())
	if err != nil {
		aiError(w, "Failed to create realtime session", err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"client_secret": token,
		"expires_at":    expiresAt,
		"model":         h.Gemini.Model(),
	})
}

func (h *Handlers) parseRecipe(w http.ResponseWriter, r *http.Request) {
	var in aiParseIn
	if err := decodeBody(r, &in); err != nil {
		Fail(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	rawText := in.rawText()
	if rawText == "" {
		Fail(w, http.StatusBadRequest, "Recipe text is required")
		return
	}

	if h.AIMock {
		WriteJSON(w, http.StatusOK, ai.MockParse(rawText))
		return
	}

	parsed, err := h.AIService.ParseRecipe(r.Context(), rawText)
	if err != nil {
		aiError(w, "Failed to parse recipe", err)
		return
	}
	WriteJSON(w, http.StatusOK, parsed)
}

func (h *Handlers) askRecipeQuestion(w http.ResponseWriter, r *http.Request) {
	var in aiAskIn
	if err := decodeBody(r, &in); err != nil {
		Fail(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	question := in.questionString()
	if len(in.Recipe) == 0 || question == "" {
		Fail(w, http.StatusBadRequest, "Recipe and question are required")
		return
	}

	var reply string
	if h.AIMock {
		reply = ai.MockAskReply(recipeField(in.Recipe, "title"))
	} else {
		systemPrompt := ai.AskSystemPrompt(
			orUndefined(recipeField(in.Recipe, "title")),
			orUndefined(recipeField(in.Recipe, "description")),
			recipeProperty(in.Recipe, "ingredients"),
			firstNonNull(
				recipeProperty(in.Recipe, "instructions"),
				recipeProperty(in.Recipe, "steps"),
			),
			recipeProperty(in.Recipe, "prep_time"),
			recipeProperty(in.Recipe, "cook_time"),
			recipeProperty(in.Recipe, "servings"),
		)
		var err error
		if reply, err = h.AIService.AskQuestion(r.Context(), systemPrompt, question); err != nil {
			aiError(w, "Failed to answer recipe question", err)
			return
		}
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"response":  reply,
		"recipe_id": nullableRecipeID(in.Recipe),
	})
}

func (h *Handlers) analyzeRecipe(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		Fail(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var analysis string
	if h.AIMock {
		analysis = ai.MockAnalysis
	} else {
		if analysis, err = h.AIService.Analyze(r.Context(), compactJSONRaw(body)); err != nil {
			aiError(w, "Failed to analyze recipe", err)
			return
		}
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"response":  analysis,
		"recipe_id": nullableRecipeID(body),
	})
}

// nullableRecipeID mirrors `recipe.id || null`.
func nullableRecipeID(recipe json.RawMessage) any {
	if id := recipeField(recipe, "id"); id != "" && id != "0" {
		return id
	}
	return nil
}

// compactJSONRaw serializes a raw request body the way JSON.stringify did
// (no HTML escaping).
func compactJSONRaw(raw []byte) string {
	var v any
	if json.Unmarshal(raw, &v) != nil || v == nil {
		return "null"
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if enc.Encode(v) != nil {
		return "null"
	}
	return string(bytes.TrimRight(buf.Bytes(), "\n"))
}
