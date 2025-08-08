import asyncio
from ..models.recipe import Recipe
from ai.ai_service import RecipeAIService
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate_recipes():
    # Initialize the AI service
    ai_service = RecipeAIService()
    
    # Get all recipes
    recipes = await Recipe.find_all().to_list()
    
    print(f"Found {len(recipes)} recipes to migrate")
    
    # Process each recipe
    for i, recipe in enumerate(recipes, 1):
        try:
            # Update the recipe embedding
            await ai_service.update_recipe_embedding(recipe)
            print(f"Migrated recipe {i}/{len(recipes)}: {recipe.title}")
        except Exception as e:
            print(f"Error migrating recipe {recipe.title}: {str(e)}")
    
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate_recipes())