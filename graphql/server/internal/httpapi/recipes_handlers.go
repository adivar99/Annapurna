package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/adivar99/annapurna-server/internal/store"
	"github.com/go-chi/chi/v5"
)

// recipeToOut reproduces the Node formatRecipe spread: every row field plus
// the camelCase additions, with JS truthiness semantics — imageUrl appears
// only when image_url is a non-empty string, and null instructions collapse
// to [].
func recipeToOut(rec *store.Recipe) map[string]any {
	b, err := json.Marshal(rec)
	if err != nil {
		return map[string]any{}
	}
	var m map[string]any
	if json.Unmarshal(b, &m) != nil {
		return map[string]any{}
	}
	if m["instructions"] == nil {
		m["instructions"] = []any{}
	}
	if s, ok := m["image_url"].(string); ok && s != "" {
		m["imageUrl"] = s
	}
	return m
}

func (h *Handlers) listRecipes(w http.ResponseWriter, r *http.Request) {
	limit := queryIntOr(r, "limit", 50)
	offset := queryIntOr(r, "skip", queryIntOr(r, "offset", 0))
	search := firstQuery(r, "query", "search")

	var (
		recipes []store.Recipe
		err     error
	)
	if search != "" {
		recipes, err = h.Recipes.Search(r.Context(), search, limit, offset)
	} else {
		recipes, err = h.Recipes.List(r.Context(), limit, offset)
	}
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}

	out := make([]map[string]any, 0, len(recipes))
	for i := range recipes {
		out = append(out, recipeToOut(&recipes[i]))
	}
	WriteJSON(w, http.StatusOK, out)
}

func (h *Handlers) latestRecipes(w http.ResponseWriter, r *http.Request) {
	limit := queryIntOr(r, "limit", 6)

	recipes, err := h.Recipes.List(r.Context(), limit, 0)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}

	out := make([]map[string]any, 0, len(recipes))
	for i := range recipes {
		out = append(out, recipeToOut(&recipes[i]))
	}
	WriteJSON(w, http.StatusOK, out)
}

func (h *Handlers) getRecipe(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !validUUID(id) {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return
	}

	recipe, err := h.Recipes.GetByID(r.Context(), id)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if recipe == nil {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return
	}
	WriteJSON(w, http.StatusOK, recipeToOut(recipe))
}

func (h *Handlers) createRecipe(w http.ResponseWriter, r *http.Request) {
	var in recipeIn
	if err := decodeBody(r, &in); err != nil {
		Fail(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	recipeData := map[string]any{
		"title":        in.Title,
		"description":  stringOrDefault(in.Description, ""),
		"ingredients":  rawOrDefault(in.Ingredients),
		"instructions": rawOrDefault(firstRaw(in.Instructions, in.Steps)),
		"prep_time":    intOrDefault(in.PrepTime, 0),
		"cook_time":    intOrDefault(in.CookTime, 0),
		"servings":     intOrDefault(in.Servings, 1),
		"difficulty":   strings.ToLower(stringOrDefault(in.Difficulty, "easy")),
		"cuisine":      strings.ToLower(stringOrDefault(in.Cuisine, "other")),
		"tags":         rawOrDefault(in.Tags),
		"image_url":    stringOrDefault(firstString(in.ImageUrl, in.Image_url), ""),
		"author_id":    userID(r),
	}

	created, err := h.Recipes.Create(r.Context(), recipeData)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusCreated, recipeToOut(created))
}

func (h *Handlers) updateRecipe(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !validUUID(id) {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return
	}

	if !h.ownsRecipe(w, r, id) {
		return
	}

	var in recipeIn
	if err := decodeBody(r, &in); err != nil {
		Fail(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	patch := map[string]any{}
	if in.Title != nil {
		patch["title"] = *in.Title
	}
	if in.Description != nil {
		patch["description"] = *in.Description
	}
	if v := firstRaw(in.Instructions, in.Steps); len(v) > 0 && string(v) != "null" {
		patch["instructions"] = v
	}
	if len(in.Ingredients) > 0 && string(in.Ingredients) != "null" {
		patch["ingredients"] = in.Ingredients
	}
	if len(in.Tags) > 0 && string(in.Tags) != "null" {
		patch["tags"] = in.Tags
	}
	if n, ok := coerceInt(in.PrepTime); ok && n != nil && *n != 0 {
		patch["prep_time"] = *n // parseInt(x) || undefined: zero is dropped
	}
	if n, ok := coerceInt(in.CookTime); ok && n != nil && *n != 0 {
		patch["cook_time"] = *n
	}
	if n, ok := coerceInt(in.Servings); ok && n != nil && *n != 0 {
		patch["servings"] = *n
	}
	if in.Difficulty != nil && *in.Difficulty != "" {
		patch["difficulty"] = strings.ToLower(*in.Difficulty)
	}
	if in.Cuisine != nil && *in.Cuisine != "" {
		patch["cuisine"] = strings.ToLower(*in.Cuisine)
	}
	if img := firstString(in.ImageUrl, in.Image_url); img != nil {
		patch["image_url"] = *img
	}

	updated, err := h.Recipes.Update(r.Context(), id, patch)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if updated == nil {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return
	}
	WriteJSON(w, http.StatusOK, recipeToOut(updated))
}

func (h *Handlers) deleteRecipe(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !validUUID(id) {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return
	}

	if !h.ownsRecipe(w, r, id) {
		return
	}

	existed, err := h.Recipes.Delete(r.Context(), id)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !existed {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Recipe deleted"})
}

// ownsRecipe enforces author ownership on mutating routes, returning false —
// and having written the response — when the caller may not proceed. Missing
// recipe → 404; someone else's → 403.
func (h *Handlers) ownsRecipe(w http.ResponseWriter, r *http.Request, recipeID string) bool {
	owner, err := h.Recipes.OwnerOf(r.Context(), recipeID)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return false
	}
	if owner == nil {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return false
	}
	if *owner == "" || !sameID(*owner, userID(r)) {
		Fail(w, http.StatusForbidden, "Not authorized")
		return false
	}
	return true
}

func firstQuery(r *http.Request, keys ...string) string {
	q := r.URL.Query()
	for _, k := range keys {
		if v := q.Get(k); v != "" {
			return v
		}
	}
	return ""
}

func stringOrDefault(s *string, fallback string) string {
	if s == nil || *s == "" {
		return fallback
	}
	return *s
}

// rawOrDefault turns absent/null JSON into an empty JSON array, matching the
// `|| []` defaults.
func rawOrDefault(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 || string(raw) == "null" {
		return json.RawMessage("[]")
	}
	return raw
}

// intOrDefault applies the strict-coerced integer or the fallback; malformed
// values fall back like `parseInt(x) || default` did for NaN.
func intOrDefault(raw json.RawMessage, fallback int) int {
	n, ok := coerceInt(raw)
	if !ok || n == nil {
		return fallback
	}
	return *n
}
