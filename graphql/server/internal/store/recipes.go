package store

import (
	"context"

	"github.com/adivar99/annapurna-server/internal/hasura"
)

// Recipes covers the recipes table operations plus the ownership lookup used
// to authorize updates and deletes.
type Recipes struct {
	client *hasura.Client
}

func NewRecipes(client *hasura.Client) *Recipes { return &Recipes{client: client} }

// List returns newest-first recipes.
func (r *Recipes) List(ctx context.Context, limit, offset int) ([]Recipe, error) {
	var out struct {
		Recipes []Recipe `json:"recipes"`
	}
	err := r.client.Exec(ctx, hasura.GetAllRecipesOp, map[string]any{
		"limit": limit, "offset": offset,
	}, &out)
	return out.Recipes, err
}

// Search ilike-matches title or description. searchTerm is wrapped in %...%
// here so callers pass the raw term, matching where the Node code did it.
func (r *Recipes) Search(ctx context.Context, term string, limit, offset int) ([]Recipe, error) {
	var out struct {
		Recipes []Recipe `json:"recipes"`
	}
	err := r.client.Exec(ctx, hasura.SearchRecipesOp, map[string]any{
		"searchTerm": "%" + term + "%", "limit": limit, "offset": offset,
	}, &out)
	return out.Recipes, err
}

// GetByID fetches one recipe or nil.
func (r *Recipes) GetByID(ctx context.Context, recipeID string) (*Recipe, error) {
	var out struct {
		Recipe *Recipe `json:"recipes_by_pk"`
	}
	err := r.client.Exec(ctx, hasura.GetRecipeByIdOp, map[string]any{"recipeId": recipeID}, &out)
	if err != nil || out.Recipe == nil {
		return nil, err
	}
	return out.Recipe, nil
}

// OwnerOf returns the author_id of a recipe, or nil when it does not exist.
func (r *Recipes) OwnerOf(ctx context.Context, recipeID string) (*string, error) {
	var out struct {
		Recipe *struct {
			AuthorID *string `json:"author_id"`
		} `json:"recipes_by_pk"`
	}
	err := r.client.Exec(ctx, hasura.GetRecipeOwnerOp, map[string]any{"id": recipeID}, &out)
	if err != nil || out.Recipe == nil {
		return nil, err
	}
	return out.Recipe.AuthorID, nil
}

// Create inserts a recipe. recipeData uses recipes_insert_input column names.
func (r *Recipes) Create(ctx context.Context, recipeData map[string]any) (*Recipe, error) {
	var out struct {
		Recipe Recipe `json:"insert_recipes_one"`
	}
	err := r.client.Exec(ctx, hasura.CreateRecipeOp, map[string]any{"recipeData": recipeData}, &out)
	if err != nil {
		return nil, err
	}
	return &out.Recipe, nil
}

// Update applies a recipes_set_input patch. The returned row carries no
// author_id/created_at (the mutation never selected them — parity with Node).
func (r *Recipes) Update(ctx context.Context, recipeID string, patch map[string]any) (*Recipe, error) {
	var out struct {
		Recipe *Recipe `json:"update_recipes_by_pk"`
	}
	err := r.client.Exec(ctx, hasura.UpdateRecipeOp, map[string]any{
		"recipeId": recipeID, "recipeData": patch,
	}, &out)
	if err != nil {
		return nil, err
	}
	return out.Recipe, nil
}

// Delete removes a recipe and reports whether a row existed.
func (r *Recipes) Delete(ctx context.Context, recipeID string) (bool, error) {
	var out struct {
		Deleted *struct {
			ID string `json:"id"`
		} `json:"delete_recipes_by_pk"`
	}
	err := r.client.Exec(ctx, hasura.DeleteRecipeOp, map[string]any{"recipeId": recipeID}, &out)
	return out.Deleted != nil, err
}
