package store

import (
	"context"
	"encoding/json"

	"github.com/adivar99/annapurna-server/internal/hasura"
)

const fallbackSessionTitle = "Recipe Conversation"

// Chat covers chat_sessions and chat_messages.
type Chat struct {
	client *hasura.Client
}

func NewChat(client *hasura.Client) *Chat { return &Chat{client: client} }

// Sessions summarizes every chat session a user owns, newest activity first.
func (c *Chat) Sessions(ctx context.Context, userID string) ([]SessionListItem, error) {
	var out struct {
		ChatSessions []chatSessionRow `json:"chat_sessions"`
	}
	err := c.client.Exec(ctx, hasura.GetUserChatSessionsOp, map[string]any{"userId": userID}, &out)
	if err != nil {
		return nil, err
	}

	items := make([]SessionListItem, 0, len(out.ChatSessions))
	for _, row := range out.ChatSessions {
		items = append(items, SessionListItem{
			SessionID:   row.ID,
			RecipeID:    row.RecipeID,
			RecipeTitle: sessionTitle(row.Recipe),
			LastMessage: lastMessageText(row.Messages),
			UpdatedAt:   row.UpdatedAt,
		})
	}
	return items, nil
}

// Detail fetches a session with its messages and full recipe projection, or
// nil when the id does not exist.
func (c *Chat) Detail(ctx context.Context, sessionID string) (*SessionDetail, error) {
	var out struct {
		Session *chatSessionRow `json:"chat_sessions_by_pk"`
	}
	err := c.client.Exec(ctx, hasura.GetChatSessionByIdOp, map[string]any{"sessionId": sessionID}, &out)
	if err != nil || out.Session == nil {
		return nil, err
	}
	row := out.Session
	messages := row.Messages
	if messages == nil {
		messages = []ChatMessage{}
	}
	return &SessionDetail{
		SessionID:   row.ID,
		UserID:      row.UserID,
		RecipeID:    row.RecipeID,
		RecipeTitle: sessionTitle(row.Recipe),
		Recipe:      row.Recipe,
		Messages:    messages,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}, nil
}

// OwnerOf returns the owning user_id of a session, or nil when missing.
func (c *Chat) OwnerOf(ctx context.Context, sessionID string) (*string, error) {
	var out struct {
		Session *struct {
			UserID string `json:"user_id"`
		} `json:"chat_sessions_by_pk"`
	}
	err := c.client.Exec(ctx, hasura.GetChatSessionOwnerOp, map[string]any{"id": sessionID}, &out)
	if err != nil || out.Session == nil {
		return nil, err
	}
	return &out.Session.UserID, nil
}

// ByRecipe finds the user's most recent session for a recipe (nil when none).
func (c *Chat) ByRecipe(ctx context.Context, userID, recipeID string) (*SessionByRecipe, error) {
	var out struct {
		ChatSessions []chatSessionRow `json:"chat_sessions"`
	}
	err := c.client.Exec(ctx, hasura.GetChatSessionByRecipeOp, map[string]any{
		"userId": userID, "recipeId": recipeID,
	}, &out)
	if err != nil {
		return nil, err
	}
	if len(out.ChatSessions) == 0 {
		return nil, nil
	}
	row := out.ChatSessions[0]
	messages := row.Messages
	if messages == nil {
		messages = []ChatMessage{}
	}
	return &SessionByRecipe{
		SessionID: row.ID,
		UserID:    row.UserID,
		RecipeID:  row.RecipeID,
		Messages:  messages,
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
	}, nil
}

// Create opens a new session; recipeID may be nil for general conversations.
func (c *Chat) Create(ctx context.Context, userID string, recipeID *string) (*chatSessionRow, error) {
	var out struct {
		Session chatSessionRow `json:"insert_chat_sessions_one"`
	}
	err := c.client.Exec(ctx, hasura.CreateChatSessionOp, map[string]any{
		"object": map[string]any{"user_id": userID, "recipe_id": recipeID},
	}, &out)
	if err != nil {
		return nil, err
	}
	return &out.Session, nil
}

// Delete removes a session (messages cascade via FK).
func (c *Chat) Delete(ctx context.Context, sessionID string) error {
	var out struct {
		Deleted *struct {
			ID string `json:"id"`
		} `json:"delete_chat_sessions_by_pk"`
	}
	return c.client.Exec(ctx, hasura.DeleteChatSessionOp, map[string]any{"sessionId": sessionID}, &out)
}

// AddMessage appends a message to a session.
func (c *Chat) AddMessage(ctx context.Context, sessionID, sender, text string) (*ChatMessage, error) {
	var out struct {
		Message ChatMessage `json:"insert_chat_messages_one"`
	}
	err := c.client.Exec(ctx, hasura.AddChatMessageOp, map[string]any{
		"object": map[string]any{"session_id": sessionID, "sender": sender, "text": text},
	}, &out)
	if err != nil {
		return nil, err
	}
	return &out.Message, nil
}

// sessionTitle extracts the title from whichever recipe projection the query
// selected, falling back like the Node resolvers did.
func sessionTitle(recipeJSON json.RawMessage) string {
	if len(recipeJSON) == 0 || string(recipeJSON) == "null" {
		return fallbackSessionTitle
	}
	var recipe struct {
		Title *string `json:"title"`
	}
	if json.Unmarshal(recipeJSON, &recipe) != nil || recipe.Title == nil {
		return fallbackSessionTitle
	}
	return *recipe.Title
}

// lastMessageText pulls the text of the newest message (queries order desc,
// limit 1) or an empty string.
func lastMessageText(messages []ChatMessage) string {
	if len(messages) == 0 {
		return ""
	}
	return messages[0].Text
}
