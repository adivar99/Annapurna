package store

import (
	"context"

	"github.com/adivar99/annapurna-server/internal/hasura"
)

// Saved covers the saved_recipes join table.
type Saved struct {
	client *hasura.Client
}

func NewSaved(client *hasura.Client) *Saved { return &Saved{client: client} }

// RecipeIDs lists every recipe id the user saved (no ordering guaranteed,
// same as Node).
func (s *Saved) RecipeIDs(ctx context.Context, userID string) ([]string, error) {
	var out struct {
		SavedRecipes []struct {
			RecipeID string `json:"recipe_id"`
		} `json:"saved_recipes"`
	}
	err := s.client.Exec(ctx, hasura.GetUserSavedRecipeIdsOp, map[string]any{"userId": userID}, &out)
	ids := make([]string, 0, len(out.SavedRecipes))
	for _, row := range out.SavedRecipes {
		ids = append(ids, row.RecipeID)
	}
	return ids, err
}

// Recipes lists full recipe objects the user saved, newest save first, with
// dangling references (deleted recipes) filtered out like Node did.
func (s *Saved) Recipes(ctx context.Context, userID string, limit, offset int) ([]*Recipe, error) {
	var out struct {
		SavedRecipes []SavedRecipe `json:"saved_recipes"`
	}
	err := s.client.Exec(ctx, hasura.GetUserSavedRecipesOp, map[string]any{
		"userId": userID, "limit": limit, "offset": offset,
	}, &out)
	recipes := make([]*Recipe, 0, len(out.SavedRecipes))
	for i := range out.SavedRecipes {
		if row := out.SavedRecipes[i]; row.Recipe != nil {
			recipes = append(recipes, row.Recipe)
		}
	}
	return recipes, err
}

// Save bookmarks a recipe for a user.
func (s *Saved) Save(ctx context.Context, userID, recipeID string) (*SaveResult, error) {
	var out struct {
		Result SaveResult `json:"insert_saved_recipes_one"`
	}
	err := s.client.Exec(ctx, hasura.SaveRecipeOp, map[string]any{
		"userId": userID, "recipeId": recipeID,
	}, &out)
	if err != nil {
		return nil, err
	}
	return &out.Result, nil
}

// Unsave removes the bookmark; deleting a non-existent pair affects zero rows
// and is reported as success, matching Node.
func (s *Saved) Unsave(ctx context.Context, userID, recipeID string) error {
	var out struct {
		Delete struct {
			AffectedRows int `json:"affected_rows"`
		} `json:"delete_saved_recipes"`
	}
	return s.client.Exec(ctx, hasura.UnsaveRecipeOp, map[string]any{
		"userId": userID, "recipeId": recipeID,
	}, &out)
}
