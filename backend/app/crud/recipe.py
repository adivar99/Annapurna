from typing import List, Optional, Dict, Any
from models.recipe import Recipe, Ingredient
from schemas.recipe import RecipeCreate, RecipeUpdate, RecipeSearch, RecipeResponse
from datetime import datetime
from ai_service import RecipeAIService
from utils import convert_recipe_to_response
from pprint import pprint

ai_service = RecipeAIService()

async def create_recipe(recipe: RecipeCreate, author_id: Optional[str] = None) -> Recipe:
    """Create a new recipe"""
    db_recipe = Recipe(
        **recipe.dict(),
        author_id=author_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    await db_recipe.insert()
    print(f"Creating recipe: {recipe.title}")
    # pprint(db_recipe)
    # We are not using embeddings at the moment because it's breaking things
    # Generate and store embedding
    await ai_service.update_recipe_embedding(db_recipe)
    
    return db_recipe

async def get_recipe(recipe_id: str) -> Optional[Recipe]:
    """Get a recipe by ID"""
    return await Recipe.get(recipe_id)

async def get_recipes(
    skip: int = 0,
    limit: int = 100,
    search_params: Optional[RecipeSearch] = None,
    filters: Optional[Dict] = None
) -> List[Recipe]:
    """Get recipes with optional filtering"""
    query: Dict[str, Any] = {}
    
    if search_params:
        if search_params.query:
            # Use semantic search for better results
            return [convert_recipe_to_response(recipe) for recipe in await ai_service.find_recipes_by_semantic_search(search_params.query, limit=limit)]
        
        if search_params.cuisine:
            query["cuisine"] = search_params.cuisine
        if search_params.difficulty:
            query["difficulty"] = search_params.difficulty
        if search_params.tags:
            query["tags"] = {"$all": search_params.tags}
        if search_params.min_prep_time is not None:
            query["prep_time"] = {"$gte": search_params.min_prep_time}
        if search_params.max_prep_time is not None:
            query.setdefault("prep_time", {})["$lte"] = search_params.max_prep_time
        if search_params.min_cook_time is not None:
            query["cook_time"] = {"$gte": search_params.min_cook_time}
        if search_params.max_cook_time is not None:
            query.setdefault("cook_time", {})["$lte"] = search_params.max_cook_time
        if search_params.servings is not None:
            query["servings"] = search_params.servings
    
    resp = await Recipe.find(query, fetch_links=True).skip(skip).limit(limit).to_list()
    return [convert_recipe_to_response(recipe) for recipe in resp]

async def update_recipe(recipe_id: str, recipe_update: RecipeUpdate) -> Optional[Recipe]:
    """Update a recipe"""
    db_recipe = await Recipe.get(recipe_id)
    if not db_recipe:
        return None
    
    update_data = recipe_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(db_recipe, field, value)
    
    await db_recipe.save()
    
    # We are not using embeddings at the moment because it's breaking things
    # TODO: Update embedding if significant changes were made
    if any(field in update_data for field in ["title", "description", "instructions", "ingredients", "cuisine", "tags"]):
        await ai_service.update_recipe_embedding(db_recipe)
    
    return db_recipe

async def delete_recipe(recipe_id: str) -> bool:
    """Delete a recipe"""
    recipe = await Recipe.get(recipe_id)
    if recipe:
        await recipe.delete()
        return True
    return False

async def get_recipes_by_author(author_id: str, skip: int = 0, limit: int = 100) -> List[Recipe]:
    """Get recipes by author ID"""
    return await Recipe.find({"author_id": author_id}).skip(skip).limit(limit).to_list()

async def search_recipes_by_ingredients(ingredients: List[str], skip: int = 0, limit: int = 100, filters = None) -> List[Recipe]:
    """Search recipes by ingredients using semantic search"""
    return await ai_service.find_recipes_by_ingredients_semantic(ingredients, limit=limit, filters=filters)

async def get_similar_recipes(recipe_id: str, limit: int = 5) -> List[Recipe]:
    """Get similar recipes based on embeddings"""
    recipe = await Recipe.get(recipe_id)
    if not recipe:
        return []
    return await ai_service.find_similar_recipes(recipe, limit=limit)

async def get_popular_recipes(limit: int = 10) -> List[Recipe]:
    """Get most popular recipes (can be extended with view count or rating)"""
    return await Recipe.find().sort([("created_at", -1)]).limit(limit).to_list()

async def get_latest_recipes(limit: int = 6) -> List[RecipeResponse]:
    """Get the most recently created recipes"""
    recipes = await Recipe.find().sort("-created_at").limit(limit).to_list()
    return [convert_recipe_to_response(recipe) for recipe in recipes] 