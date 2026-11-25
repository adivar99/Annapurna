package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/adivar99/annapurna-server/internal/auth"
	"github.com/adivar99/annapurna-server/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// signup handles POST /auth/signup (and /register). Accepts direct REST
// bodies and Hasura Action envelopes alike.
func (h *Handlers) signup(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		Fail(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var input signupInput
	if err := json.Unmarshal(unwrapActionInput(body), &input); err != nil {
		Fail(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	if input.Name == "" || input.Email == "" || input.Password == "" {
		Fail(w, http.StatusInternalServerError, "Name, email, and password are required")
		return
	}

	ctx := r.Context()

	exists, err := h.UserStore.ExistsByEmailOrUsername(ctx, input.Email, input.Username)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exists {
		Fail(w, http.StatusBadRequest, "User already exists with this email or username")
		return
	}

	hashed, err := auth.HashPassword(input.Password)
	if err != nil {
		Fail(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	user, err := h.UserStore.Create(ctx, buildUserData(input, hashed))
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}

	tokenData, err := h.Signer.Generate(user.ID, user.Email)
	if err != nil {
		Fail(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"token":      tokenData.Value,
		"expires_in": tokenData.ExpiresIn,
		"user":       publicUser(user),
	})
}

// buildUserData mirrors SignupHelper.buildUserData: normalized email,
// username defaulted from the raw email's local part.
func buildUserData(input signupInput, hashedPassword string) map[string]any {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	username := strings.TrimSpace(input.Username)
	if username == "" {
		username = strings.SplitN(input.Email, "@", 2)[0]
	}

	imageURL := any(nil)
	if input.ImageURL != "" {
		imageURL = input.ImageURL
	}

	return map[string]any{
		"name":            input.Name,
		"email":           email,
		"username":        username,
		"hashed_password": hashedPassword,
		"image_url":       imageURL,
	}
}

func publicUser(u *store.User) map[string]any {
	return map[string]any{
		"id":       u.ID,
		"name":     u.Name,
		"email":    u.Email,
		"username": u.Username,
		"imageUrl": u.ImageURL, // present even when null, like the JS object literal
	}
}

func (h *Handlers) login(w http.ResponseWriter, r *http.Request) {
	var input loginInput
	if err := decodeBody(r, &input); err != nil {
		Fail(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	login := input.lookup()
	password := input.Password

	if login == "" || password == "" {
		Fail(w, http.StatusInternalServerError, "Email/Username and password are required")
		return
	}

	user, err := h.UserStore.FindByLogin(r.Context(), login)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if user == nil || user.HashedPassword == nil || !auth.ComparePassword(*user.HashedPassword, password) {
		Fail(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	tokenData, err := h.Signer.Generate(user.ID, user.Email)
	if err != nil {
		Fail(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	out := publicUser(user)
	out["message"] = "Login successful"
	out["token"] = tokenData.Value
	out["expires_in"] = tokenData.ExpiresIn
	WriteJSON(w, http.StatusOK, out)
}

func (h *Handlers) logout(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{"message": "Logged out successfully"})
}

func (h *Handlers) me(w http.ResponseWriter, r *http.Request) {
	user, err := h.UserStore.GetByID(r.Context(), userID(r))
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if user == nil {
		Fail(w, http.StatusNotFound, "User not found")
		return
	}

	savedIDs, err := h.Saved.RecipeIDs(r.Context(), userID(r))
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if savedIDs == nil {
		savedIDs = []string{}
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"id":            user.ID,
		"name":          user.Name,
		"email":         user.Email,
		"username":      user.Username,
		"imageUrl":      user.ImageURL,
		"created_at":    user.CreatedAt,
		"updated_at":    user.UpdatedAt,
		"saved_recipes": savedIDs,
	})
}

func (h *Handlers) savedRecipeIDs(w http.ResponseWriter, r *http.Request) {
	ids, err := h.Saved.RecipeIDs(r.Context(), userID(r))
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ids == nil {
		ids = []string{}
	}
	WriteJSON(w, http.StatusOK, ids)
}

func (h *Handlers) savedRecipes(w http.ResponseWriter, r *http.Request) {
	limit := queryIntOr(r, "limit", 50)
	offset := queryIntOr(r, "skip", queryIntOr(r, "offset", 0))

	recipes, err := h.Saved.Recipes(r.Context(), userID(r), limit, offset)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}

	formatted := make([]map[string]any, 0, len(recipes))
	for _, rec := range recipes {
		out := recipeToOut(rec)
		out["isFavorite"] = true
		formatted = append(formatted, out)
	}
	WriteJSON(w, http.StatusOK, formatted)
}

func (h *Handlers) saveRecipe(w http.ResponseWriter, r *http.Request) {
	recipeID := chi.URLParam(r, "recipeId")
	if !validUUID(recipeID) {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return
	}

	result, err := h.Saved.Save(r.Context(), userID(r), recipeID)
	if err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"success": true, "data": result})
}

func (h *Handlers) unsaveRecipe(w http.ResponseWriter, r *http.Request) {
	recipeID := chi.URLParam(r, "recipeId")
	if !validUUID(recipeID) {
		Fail(w, http.StatusNotFound, "Recipe not found")
		return
	}

	if err := h.Saved.Unsave(r.Context(), userID(r), recipeID); err != nil {
		Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Recipe removed from favorites"})
}

// ---- shared helpers ----

func validUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}

// sameID compares two uuid strings case-insensitively (Postgres returns
// lowercase; JWT claims carry whatever was signed).
func sameID(a, b string) bool {
	idA, errA := uuid.Parse(a)
	idB, errB := uuid.Parse(b)
	if errA == nil && errB == nil {
		return idA == idB
	}
	return strings.EqualFold(a, b)
}

func queryIntOr(r *http.Request, key string, fallback int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
