package httpapi

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

const testSessionID = "dddd4444-0000-0000-0000-000000000001"
const testRecipeRef = "cccc3333-0000-0000-0000-000000000009"

func chatMessage(id, text string) map[string]any {
	return map[string]any{
		"id": id, "session_id": testSessionID, "sender": "user",
		"text": text, "created_at": "2026-08-03T10:00:00+00:00",
	}
}

// sessionRow mimics a chat_sessions row with the recipe + messages
// projections the list/detail queries select.
func sessionRow(userID string, withRecipe bool) map[string]any {
	row := map[string]any{
		"id":         testSessionID,
		"user_id":    userID,
		"recipe_id":  testRecipeRef,
		"created_at": "2026-08-01T10:00:00+00:00",
		"updated_at": "2026-08-03T10:00:00+00:00",
		"messages":   []any{chatMessage("m1", "How do I ferment the batter?")},
	}
	if withRecipe {
		row["recipe"] = map[string]any{"id": testRecipeRef, "title": "Masala Dosa", "image_url": ""}
	} else {
		row["recipe"] = nil
	}
	return row
}

func TestListChatSessions_RemapsSummaryShape(t *testing.T) {
	e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
		require.Equal(t, "GetUserChatSessions", op)
		require.Equal(t, testUID, varsOf(body)["userId"])
		return dataResp("chat_sessions", []any{sessionRow(testUID, false)})
	})

	rec := e.doJSON(t, http.MethodGet, "/api/chat/sessions", e.token(t, testUID), nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var rows []map[string]any
	decodeJSON(t, rec, &rows)
	require.Len(t, rows, 1)

	row := rows[0]
	require.Equal(t, testSessionID, row["session_id"])
	require.Equal(t, testRecipeRef, row["recipe_id"])
	require.Equal(t, "Recipe Conversation", row["recipe_title"]) // fallback when recipe null
	require.Equal(t, "How do I ferment the batter?", row["last_message"])
	require.Equal(t, "2026-08-03T10:00:00+00:00", row["updated_at"])

	// The raw row's own keys must not leak through.
	for _, absent := range []string{"id", "user_id", "messages"} {
		require.NotContains(t, row, absent)
	}
}

func TestListChatSessions_TitleFromRecipeProjection(t *testing.T) {
	e := newTestEnv(t, func(string, map[string]any) (int, any) {
		return dataResp("chat_sessions", []any{sessionRow(testUID, true)})
	})
	rec := e.doJSON(t, http.MethodGet, "/api/v1/chat/sessions", e.token(t, testUID), nil)
	require.Equal(t, http.StatusOK, rec.Code)

	var rows []map[string]any
	decodeJSON(t, rec, &rows)
	require.Equal(t, "Masala Dosa", rows[0]["recipe_title"])
}

func TestGetChatSession_DetailAndScoping(t *testing.T) {
	t.Run("owner sees detail with explicit null recipe", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			require.Equal(t, "GetChatSessionById", op)
			return dataResp("chat_sessions_by_pk", sessionRow(testUID, false))
		})
		rec := e.doJSON(t, http.MethodGet, "/api/chat/sessions/"+testSessionID, e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Equal(t, testSessionID, out["session_id"])
		require.Contains(t, out, "recipe") // key present even when null
		require.Nil(t, out["recipe"])
		msgs, ok := out["messages"].([]any)
		require.True(t, ok)
		require.Len(t, msgs, 1)
	})

	t.Run("foreign session reads as 404", func(t *testing.T) {
		e := newTestEnv(t, func(string, map[string]any) (int, any) {
			return dataResp("chat_sessions_by_pk", sessionRow(otherUID, false))
		})
		rec := e.doJSON(t, http.MethodGet, "/api/chat/sessions/"+testSessionID, e.token(t, testUID), nil)
		require.Equal(t, http.StatusNotFound, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Chat session not found", body["message"])
	})

	t.Run("missing session 404", func(t *testing.T) {
		e := newTestEnv(t, func(string, map[string]any) (int, any) {
			return dataResp("chat_sessions_by_pk", nil)
		})
		rec := e.doJSON(t, http.MethodGet, "/api/chat/sessions/"+testSessionID, e.token(t, testUID), nil)
		require.Equal(t, http.StatusNotFound, rec.Code)
	})
}

func TestChatSessionByRecipe_LiteralNullBody(t *testing.T) {
	t.Run("missing parameter 400", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			t.Fatalf("unexpected op %q", op)
			return unexpectedOp(op)
		})
		rec := e.doJSON(t, http.MethodGet, "/api/chat/recipe", e.token(t, testUID), nil)
		require.Equal(t, http.StatusBadRequest, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "recipe_id parameter is required", body["message"])
	})

	t.Run("no session returns literal null body", func(t *testing.T) {
		e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
			require.Equal(t, "GetChatSessionByRecipe", op)
			vars := varsOf(body)
			require.Equal(t, testUID, vars["userId"])
			require.Equal(t, testRecipeRef, vars["recipeId"])
			return dataResp("chat_sessions", []any{})
		})
		rec := e.doJSON(t, http.MethodGet, "/api/chat/recipe?recipe_id="+testRecipeRef, e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code)
		require.Equal(t, "null", rec.Body.String()) // res.json(null) parity, no newline
	})

	t.Run("found session returned", func(t *testing.T) {
		e := newTestEnv(t, func(string, map[string]any) (int, any) {
			return dataResp("chat_sessions", []any{
				map[string]any{
					"id": testSessionID, "user_id": testUID, "recipe_id": testRecipeRef,
					"created_at": "2026-08-01T10:00:00+00:00", "updated_at": "2026-08-03T10:00:00+00:00",
					"messages": []any{},
				},
			})
		})
		rec := e.doJSON(t, http.MethodGet, "/api/chat/recipe?recipeId="+testRecipeRef, e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code)
		var out map[string]any
		decodeJSON(t, rec, &out)
		require.Equal(t, testSessionID, out["session_id"])
	})
}

func TestCreateChatSession_DualIDKeys(t *testing.T) {
	var createVars map[string]any
	e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
		require.Equal(t, "CreateChatSession", op)
		createVars = varsOf(body)
		return dataResp("insert_chat_sessions_one", map[string]any{
			"id": testSessionID, "user_id": testUID, "recipe_id": testRecipeRef,
			"created_at": "2026-08-04T10:00:00+00:00", "updated_at": "2026-08-04T10:00:00+00:00",
		})
	})

	rec := e.doJSON(t, http.MethodPost, "/api/chat/sessions", e.token(t, testUID),
		map[string]any{"recipeId": testRecipeRef})
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

	var out map[string]any
	decodeJSON(t, rec, &out)
	require.Equal(t, testSessionID, out["session_id"], "{session_id: ...} wrapper key")
	require.Equal(t, testSessionID, out["id"], "spread key")

	object := createVars["object"].(map[string]any)
	require.Equal(t, testUID, object["user_id"])
	require.Equal(t, testRecipeRef, object["recipe_id"])
}

func TestAddChatMessage_ValidationAndScoping(t *testing.T) {
	url := "/api/chat/sessions/" + testSessionID + "/messages"

	newEnv := func(owner string) *env {
		return newTestEnv(t, func(op string, body map[string]any) (int, any) {
			switch op {
			case "GetChatSessionOwner":
				return dataResp("chat_sessions_by_pk", map[string]any{"user_id": owner})
			case "AddChatMessage":
				return dataResp("insert_chat_messages_one", chatMessage("m9", "ok"))
			default:
				return unexpectedOp(op)
			}
		})
	}

	t.Run("empty content 400", func(t *testing.T) {
		e := newEnv(testUID)
		rec := e.doJSON(t, http.MethodPost, url, e.token(t, testUID), map[string]any{"message": ""})
		require.Equal(t, http.StatusBadRequest, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Message content is required", body["message"])
	})

	t.Run("invalid sender 400", func(t *testing.T) {
		e := newEnv(testUID)
		rec := e.doJSON(t, http.MethodPost, url, e.token(t, testUID),
			map[string]any{"message": "hi", "sender": "robot"})
		require.Equal(t, http.StatusBadRequest, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Invalid sender", body["message"])
	})

	t.Run("text alias and uppercase sender accepted", func(t *testing.T) {
		var addVars map[string]any
		e := newTestEnv(t, func(op string, body map[string]any) (int, any) {
			switch op {
			case "GetChatSessionOwner":
				return dataResp("chat_sessions_by_pk", map[string]any{"user_id": testUID})
			case "AddChatMessage":
				addVars = varsOf(body)
				return dataResp("insert_chat_messages_one", chatMessage("m9", "hello"))
			default:
				return unexpectedOp(op)
			}
		})
		rec := e.doJSON(t, http.MethodPost, url, e.token(t, testUID),
			map[string]any{"text": "hello", "sender": "AI"})
		require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

		object := addVars["object"].(map[string]any)
		require.Equal(t, "hello", object["text"])
		require.Equal(t, "ai", object["sender"]) // lowercased before insert
		require.Equal(t, testSessionID, object["session_id"])
	})

	t.Run("foreign session 404 before validation", func(t *testing.T) {
		e := newEnv(otherUID)
		rec := e.doJSON(t, http.MethodPost, url, e.token(t, testUID), map[string]any{"message": "hi"})
		require.Equal(t, http.StatusNotFound, rec.Code)
		var body map[string]string
		decodeJSON(t, rec, &body)
		require.Equal(t, "Chat session not found", body["message"])
	})
}

func TestDeleteChatSession_OwnerOnly(t *testing.T) {
	url := "/api/chat/sessions/" + testSessionID

	t.Run("owner deletes", func(t *testing.T) {
		e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
			switch op {
			case "GetChatSessionOwner":
				return dataResp("chat_sessions_by_pk", map[string]any{"user_id": testUID})
			case "DeleteChatSession":
				return dataResp("delete_chat_sessions_by_pk", map[string]any{"id": testSessionID})
			default:
				return unexpectedOp(op)
			}
		})
		rec := e.doJSON(t, http.MethodDelete, url, e.token(t, testUID), nil)
		require.Equal(t, http.StatusOK, rec.Code)
		var body map[string]any
		decodeJSON(t, rec, &body)
		require.Equal(t, "Chat session deleted", body["message"])
	})

	t.Run("foreign or missing session 404", func(t *testing.T) {
		for _, owner := range []string{otherUID, ""} {
			e := newTestEnv(t, func(op string, _ map[string]any) (int, any) {
				require.Equal(t, "GetChatSessionOwner", op)
				if owner == "" {
					return dataResp("chat_sessions_by_pk", nil)
				}
				return dataResp("chat_sessions_by_pk", map[string]any{"user_id": owner})
			})
			rec := e.doJSON(t, http.MethodDelete, url, e.token(t, testUID), nil)
			require.Equal(t, http.StatusNotFound, rec.Code)
			var body map[string]string
			decodeJSON(t, rec, &body)
			require.Equal(t, "Chat session not found", body["message"])
		}
	})
}
