package httpapi

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

func (h *Handlers) listChatSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := h.Chat.Sessions(r.Context(), userID(r))
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, sessions)
}

func (h *Handlers) getChatSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !validUUID(id) {
		Fail(w, http.StatusNotFound, "Chat session not found")
		return
	}

	session, err := h.Chat.Detail(r.Context(), id)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	// Foreign sessions are indistinguishable from missing ones so ids can't
	// be enumerated.
	if session == nil || !sameID(session.UserID, userID(r)) {
		Fail(w, http.StatusNotFound, "Chat session not found")
		return
	}
	WriteJSON(w, http.StatusOK, session)
}

func (h *Handlers) chatSessionByRecipe(w http.ResponseWriter, r *http.Request) {
	recipeID := firstQuery(r, "recipe_id", "recipeId")
	if recipeID == "" {
		Fail(w, http.StatusBadRequest, "recipe_id parameter is required")
		return
	}
	if !validUUID(recipeID) {
		Fail(w, http.StatusBadRequest, "Invalid recipe id")
		return
	}

	session, err := h.Chat.ByRecipe(r.Context(), userID(r), recipeID)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if session == nil {
		// Literal JSON null body, exactly like res.json(null).
		WriteJSON(w, http.StatusOK, nil)
		return
	}
	WriteJSON(w, http.StatusOK, session)
}

func (h *Handlers) createChatSession(w http.ResponseWriter, r *http.Request) {
	var in chatSessionIn
	if err := decodeBody(r, &in); err != nil {
		Fail(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	recipeID := firstString(in.RecipeID, in.RecipeIDAlt)
	if recipeID != nil && !validUUID(*recipeID) {
		Fail(w, http.StatusBadRequest, "Invalid recipe id")
		return
	}

	session, err := h.Chat.Create(r.Context(), userID(r), recipeID)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}

	// {session_id: session.id, ...session} — both keys present.
	WriteJSON(w, http.StatusCreated, map[string]any{
		"session_id": session.ID,
		"id":         session.ID,
		"user_id":    session.UserID,
		"recipe_id":  session.RecipeID,
		"created_at": session.CreatedAt,
		"updated_at": session.UpdatedAt,
	})
}

func (h *Handlers) addChatMessage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !validUUID(id) {
		Fail(w, http.StatusNotFound, "Chat session not found")
		return
	}

	if !h.ownsChatSession(w, r, id) {
		return
	}

	var in chatMessageIn
	if err := decodeBody(r, &in); err != nil {
		Fail(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	content := in.content()
	if content == "" {
		Fail(w, http.StatusBadRequest, "Message content is required")
		return
	}

	sender := "user"
	if in.Sender != nil && *in.Sender != "" {
		sender = strings.ToLower(*in.Sender)
	}
	if sender != "user" && sender != "ai" { // matches the CHECK constraint; 500s were unhelpful
		Fail(w, http.StatusBadRequest, "Invalid sender")
		return
	}

	message, err := h.Chat.AddMessage(r.Context(), id, sender, content)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusCreated, message)
}

func (h *Handlers) deleteChatSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !validUUID(id) {
		Fail(w, http.StatusNotFound, "Chat session not found")
		return
	}

	if !h.ownsChatSession(w, r, id) {
		return
	}

	if err := h.Chat.Delete(r.Context(), id); err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Chat session deleted"})
}

// ownsChatSession scopes session mutations to their owner; foreign or missing
// sessions read as 404 either way.
func (h *Handlers) ownsChatSession(w http.ResponseWriter, r *http.Request, sessionID string) bool {
	owner, err := h.Chat.OwnerOf(r.Context(), sessionID)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if owner == nil || !sameID(*owner, userID(r)) {
		Fail(w, http.StatusNotFound, "Chat session not found")
		return false
	}
	return true
}
