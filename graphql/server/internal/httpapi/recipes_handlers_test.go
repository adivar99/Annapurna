package httpapi

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

const testRecipeID = "cccc3333-0000-0000-0000-000000000001"

// recipeRow mimics a Hasura recipes row: nullable columns as nulls, jsonb as
// arrays, timestamps as raw strings.
func recipeRow(id string) map[string]any {
	return map[string]any{
		"id":           id,
		"title":        "Masala Dosa",
		"description":  nil,
		"ingredients":  []any{map[string]any{"name": "rice", "quantity": 2}},
		"instructions": nil, // exercises the null→[] coalesce
		"prep_time":    20,
		"cook_time":    nil,
		"servings":     2,
		"difficulty":   "easy",
		"cuisine":      "south indian",
		"tags":         []any{"breakfast"},
		"image_url":    "", // empty string must NOT produce imageUrl
		"author_id":    testUID,
		"created_at":   "2026-08-01T10:00:00+00:00",
		"updated_at":   "2026-08-02T10:00:00+00:00",
	}
}

func TestListRecipes_ShapeParity(t *testing.T) {
	e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
		require.Equal(t, "GetAllRecipes", op)
		vars := varsOf(body)
		require.InDelta(t, 50, vars["limit"], 0)
		require.InDelta(t, 0, vars["offset"], 0)
		return dataResp("recipes", []any{recipeRow(testRecipeID)})
	})

	rec := e.doJSON(t, http.MethodGet, "/api/recipes", "", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var rows []map[string]any
	decodeJSON(t, rec, &rows)
	require.Len(t, rows, 1)
	row := rows[0]

	// JS spread parity details:
	instructions, ok := row["instructions"].([]any)
	require.True(t, ok, "null instructions must marshal as []")
	require.Empty(t, instructions)

	_, hasImage := row["imageUrl"]
	require.False(t, hasImage, "empty image_url must not add imageUrl")

	_, hasDesc := row["description"]
	require.True(t, hasDesc) // explicit null stays
	require.Nil(t, row["description"])

	require.Equal(t, testUID, row["author_id"])
	require.Equal(t, "2026-08-01T10:00:00+00:00", row["created_at"])
}

func TestSearchRecipes_WrapsTermAndSupportsAlias(t *testing.T) {
	for _, q := range []string{"/api/recipes?query=dosa", "/api/v1/recipes?search=dosa"} {
		e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
			require.Equal(t, "SearchRecipes", op)
			vars := varsOf(body)
			require.Equal(t, "%dosa%", vars["searchTerm"])
			return dataResp("recipes", []any{})
		})
		rec := e.doJSON(t, http.MethodGet, q, "", nil)
		require.Equal(t, http.StatusOK, rec.Code)
		require.JSONEq(t, "[]", rec.Body.String())
	}
}

func TestLatestRecipes_DefaultLimitSix(t *testing.T) {
	e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
		require.Equal(t, "GetAllRecipes", op)
		vars := varsOf(body)
		require.InDelta(t, 6, vars["limit"], 0)
		require.InDelta(t, 0, vars["offset"], 0)
		return dataResp("recipes", []any{})
	})
	rec := e.doJSON(t, http.MethodGet, "/api/v1/recipes/latest", "", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	require.JSONEq(t, "[]", rec.Body.String())
}

func TestGetRecipe(t *testing.T) {
	t.Run("invalid uuid 404", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodGet, "/api/recipes/not-a-uuid", "", nil)
		require.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("missing recipe 404", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			require.Equal(t, "GetRecipeById", op)
			return dataResp("recipes_by_pk", nil)
		})
		rec := e.doJSON(t, http.MethodGet, "/api/recipes/"+testRecipeID, "", nil)
		require.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("found with promoted imageUrl", func(t *testing.T) {
		row := recipeRow(testRecipeID)
		row["image_url"] = "http://localhost:9000/public-images/images/x.png"
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			require.Equal(t, "GetRecipeById", op)
			return dataResp("recipes_by_pk", row)
		})
		rec := e.doJSON(t, http.MethodGet, "/api/recipes/"+testRecipeID, "", nil)
		require.Equal(t, http.StatusOK, rec.Code)
		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Equal(t, row["image_url"], out["imageUrl"])
	})
}

func TestCreateRecipe_TrailingSlashDefaultsAndAuthorship(t *testing.T) {
	var createVars map[string]any
	e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
		require.Equal(t, "CreateRecipe", op)
		createVars = varsOf(body)
		return dataResp("insert_recipes_one", recipeRow(testRecipeID))
	})

	// The frontend POSTs /recipes/ WITH a trailing slash — StripSlashes keeps
	// that working.
	rec := e.doJSON(t, http.MethodPost, "/api/recipes/", e.token(t, testUID), map[string]any{
		"title":      "Masala Dosa",
		"difficulty": "EASY",
		"cuisine":    "South Indian",
	})
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

	data := createVars["recipeData"].(map[string]any)
	require.Equal(t, "Masala Dosa", data["title"])
	require.Equal(t, "", data["description"])       // default
	require.Equal(t, []any{}, data["instructions"]) // default via steps alias absence
	require.Equal(t, []any{}, data["ingredients"])  // default
	require.InDelta(t, 0, data["prep_time"], 0)     // default
	require.InDelta(t, 1, data["servings"], 0)      // default
	require.Equal(t, "easy", data["difficulty"])    // lowercased
	require.Equal(t, "south indian", data["cuisine"])
	require.Equal(t, testUID, data["author_id"]) // from token, not body

	var out map[string]any
	decodeJSON(t, rec, &out)
	require.Equal(t, testUID, out["author_id"])
}

func TestCreateRecipe_StepsAliasAndNumericStrings(t *testing.T) {
	var createVars map[string]any
	e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
		createVars = varsOf(body)
		return dataResp("insert_recipes_one", recipeRow(testRecipeID))
	})
	rec := e.doJSON(t, http.MethodPost, "/api/recipes", e.token(t, testUID), map[string]any{
		"title":     "Pancakes",
		"steps":     []string{"mix", "fry"},
		"prep_time": "35", // numeric string accepted like the JS parseInt path
		"imageUrl":  "http://x/p.png",
	})
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

	data := createVars["recipeData"].(map[string]any)
	require.Equal(t, []any{"mix", "fry"}, data["instructions"]) // steps alias feeds instructions
	require.InDelta(t, 35, data["prep_time"], 0)
	require.Equal(t, "http://x/p.png", data["image_url"])
}

func TestUpdateRecipe_OwnershipMatrix(t *testing.T) {
	path := "/api/recipes/" + testRecipeID

	updateRow := func() map[string]any {
		// Real Hasura returns only what UpdateRecipe selects — no author_id,
		// no created_at.
		return map[string]any{
			"id": testRecipeID, "title": "Renamed Dosa", "description": nil,
			"ingredients": []any{}, "instructions": []any{},
			"prep_time": 20, "cook_time": nil, "servings": 2,
			"difficulty": "easy", "cuisine": "south indian", "tags": nil,
			"image_url": "", "updated_at": "2026-08-05T10:00:00+00:00",
		}
	}

	t.Run("owner may update; response omits author_id and created_at", func(t *testing.T) {
		e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
			switch op {
			case "GetRecipeOwner":
				return dataResp("recipes_by_pk", map[string]any{"author_id": testUID})
			case "UpdateRecipe":
				patch := varsOf(body)["recipeData"].(map[string]any)
				require.Equal(t, map[string]any{"title": "Renamed Dosa"}, patch)
				return dataResp("update_recipes_by_pk", updateRow())
			default:
				return unexpectedOp(op)
			}
		})
		rec := e.doJSON(t, http.MethodPut, path, e.token(t, testUID), map[string]any{"title": "Renamed Dosa"})
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

		var out map[string]any
		decodeJSON(t, rec, &out)
		_, hasAuthor := out["author_id"]
		require.False(t, hasAuthor, "UpdateRecipe response must omit author_id (Node parity)")
		_, hasCreated := out["created_at"]
		require.False(t, hasCreated)
		require.Equal(t, "Renamed Dosa", out["title"])
	})

	t.Run("other user's recipe 403", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			require.Equal(t, "GetRecipeOwner", op)
			return dataResp("recipes_by_pk", map[string]any{"author_id": otherUID})
		})
		rec := e.doJSON(t, http.MethodPut, path, e.token(t, testUID), map[string]any{"title": "hijack"})
		require.Equal(t, http.StatusForbidden, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Not authorized", body["message"])
	})

	t.Run("nonexistent recipe 404", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			require.Equal(t, "GetRecipeOwner", op)
			return dataResp("recipes_by_pk", nil)
		})
		rec := e.doJSON(t, http.MethodPut, path, e.token(t, testUID), map[string]any{"title": "x"})
		require.Equal(t, http.StatusNotFound, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Recipe not found", body["message"])
	})

	t.Run("zero numeric values are dropped from patch", func(t *testing.T) {
		e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
			if op == "GetRecipeOwner" {
				return dataResp("recipes_by_pk", map[string]any{"author_id": testUID})
			}
			patch := varsOf(body)["recipeData"].(map[string]any)
			require.NotContains(t, patch, "cook_time") // 0 dropped: parseInt||undefined
			require.NotContains(t, patch, "difficulty")
			return dataResp("update_recipes_by_pk", updateRow())
		})
		body := map[string]any{"cook_time": 0, "difficulty": ""}
		rec := e.doJSON(t, http.MethodPut, path, e.token(t, testUID), body)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	})
}

func TestDeleteRecipe_OwnershipMatrix(t *testing.T) {
	path := "/api/recipes/" + testRecipeID

	t.Run("owner deletes successfully", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			switch op {
			case "GetRecipeOwner":
				return dataResp("recipes_by_pk", map[string]any{"author_id": testUID})
			case "DeleteRecipe":
				return dataResp("delete_recipes_by_pk", map[string]any{"id": testRecipeID})
			default:
				return unexpectedOp(op)
			}
		})
		rec := e.doJSON(t, http.MethodDelete, path, e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		var body map[string]any
		decodeJSON(t, rec, &body)
		require.Equal(t, true, body["success"])
		require.Equal(t, "Recipe deleted", body["message"])
	})

	t.Run("other user's recipe 403", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			require.Equal(t, "GetRecipeOwner", op)
			return dataResp("recipes_by_pk", map[string]any{"author_id": otherUID})
		})
		rec := e.doJSON(t, http.MethodDelete, path, e.token(t, testUID), nil)
		require.Equal(t, http.StatusForbidden, rec.Code)
	})
}
