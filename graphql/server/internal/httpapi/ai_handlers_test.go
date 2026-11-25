package httpapi

import (
	"net/http"
	"testing"
	"time"

	"github.com/adivar99/annapurna-server/internal/ai"
	"github.com/stretchr/testify/require"
)

func TestRealtimeSession_MockFixture(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		t.Fatalf("unexpected op %q", op)
		return unexpectedOp(op)
	})

	before := time.Now().Unix()
	rec := e.doJSON(t, http.MethodPost, "/api/ai/realtime/session", e.token(t, testUID), nil)
	after := time.Now().Unix()
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var out map[string]any
	decodeJSON(t, rec, &out)
	require.Equal(t, ai.MockClientSecret, out["client_secret"])
	require.GreaterOrEqual(t, out["expires_at"].(float64), float64(before+3600))
	require.LessOrEqual(t, out["expires_at"].(float64), float64(after+3600))
}

func TestParseRecipe_Mock(t *testing.T) {
	t.Run("missing text 400", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodPost, "/api/ai/parse", e.token(t, testUID), map[string]any{})
		require.Equal(t, http.StatusBadRequest, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Recipe text is required", body["message"])
	})

	t.Run("fixture title from first line", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodPost, "/api/v1/ai/parse", e.token(t, testUID),
			map[string]any{"recipe_text": "## Masala Dosa\nGrind the batter."})
		require.Equal(t, http.StatusOK, rec.Code)

		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Equal(t, "Masala Dosa", out["title"]) // hashes stripped, no extra trim
		require.Equal(t, "Parsed from text", out["description"])

		ingredients := out["ingredients"].([]any)
		require.Len(t, ingredients, 2)
		first := ingredients[0].(map[string]any)
		require.Equal(t, "Flour", first["name"])
		require.InDelta(t, 2, first["quantity"], 0)

		instructions := out["instructions"].([]any)
		require.Len(t, instructions, 3)
		require.Equal(t, "Bake for 25-30 minutes until golden.", instructions[2])

		require.InDelta(t, 4, out["servings"], 0)
		tags := out["tags"].([]any)
		require.Len(t, tags, 2)
	})
}

func TestAskRecipeQuestion_Mock(t *testing.T) {
	t.Run("missing recipe or question 400", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		for _, body := range []map[string]any{
			{},
			{"question": "How hot?"},
			{"recipe": map[string]any{"title": "Dosa"}},
		} {
			rec := e.doJSON(t, http.MethodPost, "/api/ai/ask-recipe-question", e.token(t, testUID), body)
			require.Equal(t, http.StatusBadRequest, rec.Code)
			var errBody map[string]string
			decodeJSON(t, rec, &errBody)
			require.Equal(t, "Recipe and question are required", errBody["message"])
		}
	})

	t.Run("mock reply references title; id passthrough", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodPost, "/api/ai/ask-recipe-question", e.token(t, testUID), map[string]any{
			"recipe":   map[string]any{"id": "r-9", "title": "Pancakes"},
			"question": []string{"How", "hot?"}, // array questions accepted
		})
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Contains(t, out["response"], `cooking assistant for "Pancakes"`)
		require.Equal(t, "r-9", out["recipe_id"])
	})

	t.Run("absent recipe id yields null", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodPost, "/api/ai/ask-recipe-question", e.token(t, testUID), map[string]any{
			"recipe":   map[string]any{"title": "Pancakes"},
			"question": "How hot?",
		})
		require.Equal(t, http.StatusOK, rec.Code)
		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Contains(t, out, "recipe_id")
		require.Nil(t, out["recipe_id"])
	})
}

func TestAnalyzeRecipe_Mock(t *testing.T) {
	t.Run("analysis fixture with numeric id stringified", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		// The analyze route takes the recipe as the raw body.
		rec := e.doJSON(t, http.MethodPost, "/api/ai/analyze-recipe", e.token(t, testUID),
			map[string]any{"id": 42, "title": "Dosa"})
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Equal(t, ai.MockAnalysis, out["response"])
		require.Equal(t, "42", out["recipe_id"]) // JS `${recipe.id}` parity
	})

	t.Run("no id gives null", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodPost, "/api/ai/analyze-recipe", e.token(t, testUID),
			map[string]any{"title": "Dosa"})
		require.Equal(t, http.StatusOK, rec.Code)
		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Contains(t, out, "recipe_id")
		require.Nil(t, out["recipe_id"])
	})
}
