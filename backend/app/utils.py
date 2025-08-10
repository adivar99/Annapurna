from models.recipe import Recipe
from schemas.recipe import RecipeResponse, IngredientBase

def convert_recipe_to_response(recipe: Recipe):
    """Convert a recipe model to a recipe response schema"""

    recipe_ingredients = [
        IngredientBase(
            name=ingredient.name,
            quantity=ingredient.quantity,
            unit=ingredient.unit,
            notes=ingredient.notes
        )
        for ingredient in recipe.ingredients
    ]
    return RecipeResponse(
                id=str(recipe.id),
                title=recipe.title,
                description=recipe.description,
                instructions=recipe.instructions,
                imageUrl=recipe.imageUrl,
                ingredients=recipe_ingredients,
                prep_time=recipe.prep_time,
                cook_time=recipe.cook_time,
                servings=recipe.servings,
                difficulty=recipe.difficulty,
                cuisine=recipe.cuisine,
                tags=recipe.tags,
                created_at=recipe.created_at,
                updated_at=recipe.updated_at
    )