package httpapi

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/adivar99/annapurna-server/internal/auth"
	"github.com/stretchr/testify/require"
)

// dataResp wraps a value in Hasura's {"data": {...}} envelope.
func dataResp(key string, v any) (int, any) {
	return http.StatusOK, map[string]any{"data": map[string]any{key: v}}
}

func gqlErr(message string) (int, any) {
	return http.StatusOK, map[string]any{
		"errors": []any{map[string]any{"message": message}},
	}
}

func varsOf(body map[string]any) map[string]any {
	vars, _ := body["variables"].(map[string]any)
	return vars
}

func TestSignup_DirectBody(t *testing.T) {
	var createdVars map[string]any
	e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
		switch op {
		case "CheckUser":
			require.Equal(t, "Ada@Example.com ", varsOf(body)["email"])
			return dataResp("users", []any{})
		case "CreateUser":
			createdVars = varsOf(body)
			return dataResp("insert_users_one", map[string]any{
				"id":              testUID,
				"name":            "Ada",
				"email":           "ada@example.com",
				"username":        "Ada",
				"hashed_password": "$2a$12$stub",
				"image_url":       nil,
				"created_at":      "2026-08-01T10:00:00+00:00",
				"updated_at":      "2026-08-01T10:00:00+00:00",
			})
		default:
			return unexpectedOp(op)
		}
	})

	rec := e.doJSON(t, http.MethodPost, "/api/auth/signup", "", map[string]any{
		"name":     "Ada",
		"email":    "Ada@Example.com ",
		"password": "hunter2pw",
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var out struct {
		Token     string         `json:"token"`
		ExpiresIn string         `json:"expires_in"`
		User      map[string]any `json:"user"`
	}
	decodeJSON(t, rec, &out)
	require.NotEmpty(t, out.Token)
	require.Equal(t, "24h", out.ExpiresIn)

	// imageUrl key present even when null — object literal parity.
	require.Contains(t, out.User, "imageUrl")
	require.Nil(t, out.User["imageUrl"])
	require.Equal(t, "ada@example.com", out.User["email"])

	// userData columns: normalized email, username defaulted from the raw
	// email's local part.
	userData := createdVars["userData"].(map[string]any)
	require.Equal(t, "ada@example.com", userData["email"])
	require.Equal(t, "Ada", userData["username"])
	require.Equal(t, "Ada", userData["name"])
	require.Nil(t, userData["image_url"])
	require.Regexp(t, `^\$2a\$12\$`, userData["hashed_password"])
}

func TestSignup_ActionEnvelope(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		switch op {
		case "CheckUser":
			return dataResp("users", []any{})
		case "CreateUser":
			return dataResp("insert_users_one", map[string]any{"id": testUID, "email": "e@x.co"})
		default:
			return unexpectedOp(op)
		}
	})

	envelope := map[string]any{
		"input": map[string]any{
			"input": map[string]any{
				"name": "Ada", "email": "e@x.co", "password": "pw1234567",
			},
		},
	}
	rec := e.doJSON(t, http.MethodPost, "/api/auth/register", "", envelope)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
}

func TestSignup_DuplicateRejected(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		switch op {
		case "CheckUser":
			return dataResp("users", []any{map[string]any{"id": otherUID}})
		default:
			return unexpectedOp(op)
		}
	})
	rec := e.doJSON(t, http.MethodPost, "/api/auth/signup", "", map[string]any{
		"name": "Ada", "email": "taken@x.co", "password": "pw1234567",
	})
	require.Equal(t, http.StatusBadRequest, rec.Code)
	var body map[string]string
	decodeJSON(t, rec, &body)
	require.Equal(t, "User already exists with this email or username", body["message"])
}

func TestSignup_MissingFields_KeepsParityQuirk(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		t.Fatalf("no Hasura op expected for a missing-fields body, got %q", op)
		return unexpectedOp(op)
	})
	rec := e.doJSON(t, http.MethodPost, "/api/auth/signup", "", map[string]any{"name": "Ada"})
	require.Equal(t, http.StatusInternalServerError, rec.Code) // Node parity quirk
	var body map[string]string
	decodeJSON(t, rec, &body)
	require.Equal(t, "Name, email, and password are required", body["message"])
}

func TestLogin(t *testing.T) {
	hash, err := auth.HashPassword("s3cret-pw")
	require.NoError(t, err)
	row := func() map[string]any {
		return map[string]any{
			"id": testUID, "name": "Ada", "email": "ada@example.com",
			"username": "ada", "hashed_password": hash, "image_url": nil,
			"created_at": "2026-08-01T10:00:00+00:00", "updated_at": "2026-08-01T10:00:00+00:00",
		}
	}

	t.Run("success via login field lowercased", func(t *testing.T) {
		e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
			require.Equal(t, "LoginUser", op)
			require.Equal(t, "ada", varsOf(body)["login"])
			return dataResp("users", []any{row()})
		})
		rec := e.doJSON(t, http.MethodPost, "/api/auth/login", "", map[string]any{
			"login": "ADA", "password": "s3cret-pw",
		})
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Equal(t, "Login successful", out["message"])
		require.NotEmpty(t, out["token"])
		require.Equal(t, "24h", out["expires_in"])
	})

	t.Run("wrong password 401", func(t *testing.T) {
		e := newTestEnv(t, func(string, map[string]any) (int, any) {
			return dataResp("users", []any{row()})
		})
		rec := e.doJSON(t, http.MethodPost, "/api/v1/auth/login", "", map[string]any{
			"login": "ada", "password": "nope",
		})
		require.Equal(t, http.StatusUnauthorized, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Invalid credentials", body["message"])
	})

	t.Run("unknown user 401", func(t *testing.T) {
		e := newTestEnv(t, func(string, map[string]any) (int, any) {
			return dataResp("users", []any{})
		})
		rec := e.doJSON(t, http.MethodPost, "/api/auth/login", "", map[string]any{
			"email": "ghost@x.co", "password": "whatever",
		})
		require.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("missing fields keeps 500 quirk", func(t *testing.T) {
		e := newTestEnv(t, func(string, map[string]any) (int, any) {
			t.Fatal("no Hasura op expected")
			return unexpectedOp("")
		})
		rec := e.doJSON(t, http.MethodPost, "/api/auth/login", "", map[string]any{"password": "x"})
		require.Equal(t, http.StatusInternalServerError, rec.Code)
	})
}

func TestLogout(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		t.Fatalf("unexpected op %q", op)
		return unexpectedOp(op)
	})
	rec := e.doJSON(t, http.MethodPost, "/api/auth/logout", "", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	var body map[string]string
	decodeJSON(t, rec, &body)
	require.Equal(t, "Logged out successfully", body["message"])
}

func TestMe_AuthMatrixAndShape(t *testing.T) {
	newEnv := func() *env {
		return newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			switch op {
			case "GetUserById":
				return dataResp("users_by_pk", map[string]any{
					"id": testUID, "name": "Ada", "email": "ada@example.com",
					"username": "ada", "image_url": nil,
					"created_at": "2026-08-01T10:00:00+00:00", "updated_at": "2026-08-01T10:00:00+00:00",
				})
			case "GetUserSavedRecipeIds":
				return dataResp("saved_recipes", []any{
					map[string]any{"recipe_id": "aaaa1111-0000-0000-0000-000000000001"},
					map[string]any{"recipe_id": "aaaa1111-0000-0000-0000-000000000002"},
				})
			default:
				return unexpectedOp(op)
			}
		})
	}

	t.Run("no token", func(t *testing.T) {
		e := newEnv()
		rec := e.doJSON(t, http.MethodGet, "/api/auth/me", "", nil)
		require.Equal(t, http.StatusUnauthorized, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Access denied. No token provided.", body["message"])
	})

	t.Run("malformed header", func(t *testing.T) {
		e := newEnv()
		req, _ := http.NewRequest(http.MethodGet, e.Server.URL+"/api/auth/me", nil)
		req.Header.Set("Authorization", "Token abc")
		res, err := e.Server.Client().Do(req)
		require.NoError(t, err)
		defer res.Body.Close()
		require.Equal(t, http.StatusUnauthorized, res.StatusCode)
	})

	t.Run("shape with saved ids on both prefixes", func(t *testing.T) {
		for _, path := range []string{"/api/auth/me", "/api/v1/auth/me"} {
			e := newEnv()
			rec := e.doJSON(t, http.MethodGet, path, e.token(t, testUID), nil)
			require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

			var me map[string]any
			decodeJSON(t, rec, &me)
			require.Equal(t, testUID, me["id"])
			require.Contains(t, me, "imageUrl") // explicit null stays present
			require.Nil(t, me["imageUrl"])
			saved, ok := me["saved_recipes"].([]any)
			require.True(t, ok)
			require.Len(t, saved, 2)
		}
	})
}

func TestSavedRecipeEndpoints(t *testing.T) {
	t.Run("ids bare array, empty as []", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			require.Equal(t, "GetUserSavedRecipeIds", op)
			return dataResp("saved_recipes", []any{})
		})
		rec := e.doJSON(t, http.MethodGet, "/api/auth/me/save-recipe", e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code)
		require.JSONEq(t, "[]", rec.Body.String())
	})

	t.Run("save returns row under data", func(t *testing.T) {
		recipeID := "bbbb2222-0000-0000-0000-000000000009"
		e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
			require.Equal(t, "SaveRecipe", op)
			vars := varsOf(body)
			require.Equal(t, testUID, vars["userId"])
			require.Equal(t, recipeID, vars["recipeId"])
			return dataResp("insert_saved_recipes_one", map[string]any{
				"id": "cccc3333", "user_id": testUID, "recipe_id": recipeID,
				"saved_at": "2026-08-04T10:00:00+00:00",
			})
		})
		rec := e.doJSON(t, http.MethodPost, "/api/auth/me/save-recipe/"+recipeID, e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		var out struct {
			Success bool `json:"success"`
			Data    struct {
				RecipeID string `json:"recipe_id"`
			} `json:"data"`
		}
		decodeJSON(t, rec, &out)
		require.True(t, out.Success)
		require.Equal(t, recipeID, out.Data.RecipeID)
	})

	t.Run("invalid uuid 404", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodDelete, "/api/auth/me/save-recipe/not-a-uuid", e.token(t, testUID), nil)
		require.Equal(t, http.StatusNotFound, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Recipe not found", body["message"])
	})

	t.Run("unsave always succeeds", func(t *testing.T) {
		recipeID := "bbbb2222-0000-0000-0000-000000000009"
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			require.Equal(t, "UnsaveRecipe", op)
			return dataResp("delete_saved_recipes", map[string]any{"affected_rows": 0})
		})
		rec := e.doJSON(t, http.MethodDelete, fmt.Sprintf("/api/auth/me/save-recipe/%s", recipeID), e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code)
		var body map[string]any
		decodeJSON(t, rec, &body)
		require.Equal(t, true, body["success"])
		require.Equal(t, "Recipe removed from favorites", body["message"])
	})
}

func TestSavedRecipes_ListAddsIsFavorite(t *testing.T) {
	e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
		require.Equal(t, "GetUserSavedRecipes", op)
		vars := varsOf(body)
		require.InDelta(t, 5, vars["limit"], 0) // skip alias maps to offset
		require.InDelta(t, 10, vars["offset"], 0)
		return dataResp("saved_recipes", []any{
			map[string]any{
				"id": "sr1", "recipe_id": "rrrr1000-0000-0000-0000-000000000001",
				"saved_at": "2026-08-04T10:00:00+00:00",
				"recipe": map[string]any{
					"id": "rrrr1000-0000-0000-0000-000000000001", "title": "Dosa",
					"description": nil, "ingredients": []any{}, "instructions": nil,
					"prep_time": nil, "cook_time": nil, "servings": 1,
					"difficulty": "easy", "cuisine": "indian", "tags": nil,
					"image_url": "http://x/y.png", "author_id": testUID,
					"created_at": "2026-08-01T10:00:00+00:00", "updated_at": "2026-08-02T10:00:00+00:00",
				},
			},
		})
	})

	rec := e.doJSON(t, http.MethodGet, "/api/auth/me/saved-recipes?limit=5&skip=10", e.token(t, testUID), nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var rows []map[string]any
	decodeJSON(t, rec, &rows)
	require.Len(t, rows, 1)
	require.Equal(t, true, rows[0]["isFavorite"]) // handler-added flag
	require.Contains(t, rows[0], "imageUrl")      // non-empty image_url promoted
	require.Equal(t, []any{}, rows[0]["instructions"])
}

func TestHealthEndpoint(t *testing.T) {
	e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
		t.Fatalf("unexpected op %q", op)
		return unexpectedOp(op)
	})
	rec := e.doJSON(t, http.MethodGet, "/health", "", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	var body map[string]any
	decodeJSON(t, rec, &body)
	require.Equal(t, "OK", body["status"])
	ts, _ := body["timestamp"].(string)
	require.Regexp(t, `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$`, ts)
}
