from models.recipe import Recipe
from schemas.recipe import RecipeResponse

def convert_recipe_to_response(recipe: Recipe):
    return RecipeResponse(
                id=str(recipe.id),
                title=recipe.title,
                description=recipe.description,
                instructions=recipe.instructions,
                ingredients=recipe.ingredients,
                prep_time=recipe.prep_time,
                cook_time=recipe.cook_time,
                servings=recipe.servings,
                difficulty=recipe.difficulty,
                cuisine=recipe.cuisine,
                tags=recipe.tags,
                created_at=recipe.created_at,
                updated_at=recipe.updated_at
    )