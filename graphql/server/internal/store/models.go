// Package store wraps every Hasura operation the API performs, split by
// aggregate. Rows keep Hasura's exact field names; jsonb/timestamp columns
// pass through as raw JSON so API responses round-trip byte-for-byte what the
// Node server emitted.
package store

import "encoding/json"

// User mirrors public.users. SavedRecipes is only populated by GetUserById
// (the query selects the nested relation).
type User struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Email          string          `json:"email"`
	Username       *string         `json:"username"`
	HashedPassword *string         `json:"hashed_password"`
	ImageURL       *string         `json:"image_url"`
	CreatedAt      json.RawMessage `json:"created_at"`
	UpdatedAt      json.RawMessage `json:"updated_at"`
	SavedRecipes   []SavedRef      `json:"saved_recipes,omitempty"`
}

// SavedRef is the {recipe_id} projection nested under users_by_pk.
type SavedRef struct {
	RecipeID string `json:"recipe_id"`
}

// Recipe mirrors public.recipes as returned by the list/get/insert queries.
// AuthorID and CreatedAt use omitempty because the UpdateRecipe mutation does
// not select them — its response must omit those keys, exactly like the JS
// spread did. Every other nullable field stays present (null included), so
// they are pointers/RawMessage WITHOUT omitempty.
type Recipe struct {
	ID           string          `json:"id"`
	Title        *string         `json:"title"`
	Description  *string         `json:"description"`
	Ingredients  json.RawMessage `json:"ingredients"`
	Instructions json.RawMessage `json:"instructions"`
	PrepTime     *int            `json:"prep_time"`
	CookTime     *int            `json:"cook_time"`
	Servings     *int            `json:"servings"`
	Difficulty   *string         `json:"difficulty"`
	Cuisine      *string         `json:"cuisine"`
	Tags         json.RawMessage `json:"tags"`
	ImageURL     *string         `json:"image_url"`
	AuthorID     *string         `json:"author_id,omitempty"`
	CreatedAt    json.RawMessage `json:"created_at,omitempty"`
	UpdatedAt    json.RawMessage `json:"updated_at"`
}

// SavedRecipe is a saved_recipes row; Recipe is selected only by
// GetUserSavedRecipes (nil for the ids-only query).
type SavedRecipe struct {
	ID       string          `json:"id"`
	SavedAt  json.RawMessage `json:"saved_at"`
	RecipeID string          `json:"recipe_id"`
	Recipe   *Recipe         `json:"recipe,omitempty"`
}

// SaveResult is the payload returned by the SaveRecipe mutation.
type SaveResult struct {
	ID       string          `json:"id"`
	UserID   string          `json:"user_id"`
	RecipeID string          `json:"recipe_id"`
	SavedAt  json.RawMessage `json:"saved_at"`
}

// ChatMessage mirrors public.chat_messages.
type ChatMessage struct {
	ID        string          `json:"id"`
	SessionID string          `json:"session_id"`
	Sender    string          `json:"sender"`
	Text      string          `json:"text"`
	CreatedAt json.RawMessage `json:"created_at"`
}

// chatSessionRow is the raw shape Hasura returns for chat_sessions rows;
// handlers reshape it into the wire formats below.
type chatSessionRow struct {
	ID        string          `json:"id"`
	UserID    string          `json:"user_id"`
	RecipeID  *string         `json:"recipe_id"`
	CreatedAt json.RawMessage `json:"created_at"`
	UpdatedAt json.RawMessage `json:"updated_at"`
	// Recipe holds whatever recipe projection the query selected ({id,title,
	// image_url} for lists, the full recipe for by-id lookups); null when the
	// session has no recipe or the field was not selected.
	Recipe   json.RawMessage `json:"recipe,omitempty"`
	Messages []ChatMessage   `json:"messages,omitempty"`
}

// SessionListItem is one entry of GET /chat/sessions (the remapped summary
// shape the Node resolver produced).
type SessionListItem struct {
	SessionID   string          `json:"session_id"`
	RecipeID    *string         `json:"recipe_id"`
	RecipeTitle string          `json:"recipe_title"`
	LastMessage string          `json:"last_message"`
	UpdatedAt   json.RawMessage `json:"updated_at"`
}

// SessionDetail is GET /chat/sessions/:id.
type SessionDetail struct {
	SessionID   string          `json:"session_id"`
	UserID      string          `json:"user_id"`
	RecipeID    *string         `json:"recipe_id"`
	RecipeTitle string          `json:"recipe_title"`
	Recipe      json.RawMessage `json:"recipe"` // explicit null when absent
	Messages    []ChatMessage   `json:"messages"`
	CreatedAt   json.RawMessage `json:"created_at"`
	UpdatedAt   json.RawMessage `json:"updated_at"`
}

// SessionByRecipe is GET /chat/recipe (no title/recipe projection).
type SessionByRecipe struct {
	SessionID string          `json:"session_id"`
	UserID    string          `json:"user_id"`
	RecipeID  *string         `json:"recipe_id"`
	Messages  []ChatMessage   `json:"messages"`
	CreatedAt json.RawMessage `json:"created_at"`
	UpdatedAt json.RawMessage `json:"updated_at"`
}
