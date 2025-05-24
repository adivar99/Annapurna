from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict
from schemas.recipe import RecipeCreate, RecipeUpdate, RecipeResponse, RecipeSearch
from crud.recipe import (
    create_recipe,
    get_recipe,
    get_recipes,
    update_recipe,
    delete_recipe,
    get_recipes_by_author,
    search_recipes_by_ingredients,
    get_popular_recipes,
    get_similar_recipes,
    get_latest_recipes
)
from core.deps import get_current_user, get_current_active_user
from models.user import User
from utils import convert_recipe_to_response

router = APIRouter(
    prefix="/recipes",
    tags=["recipes"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=RecipeResponse, summary="Create a new recipe")
async def create_new_recipe(
    recipe: RecipeCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new recipe. Requires authentication."""
    db_recipe = await create_recipe(recipe, author_id=str(current_user.id))
    return convert_recipe_to_response(db_recipe)

@router.get("/latest", response_model=List[RecipeResponse], summary="Get the latest recipes")
async def read_latest_recipes(limit: int = Query(6, description="Number of latest recipes to return")):
    """Get the most recently created recipes, sorted by creation date."""
    return await get_latest_recipes(limit=limit)

@router.get("/{recipe_id}", response_model=RecipeResponse, summary="Get a recipe by ID")
async def read_recipe(recipe_id: str):
    """Get a specific recipe by its ID."""
    recipe = await get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

@router.get("/", response_model=List[RecipeResponse], summary="Get all recipes")
async def read_recipes(
    skip: int = 0,
    limit: int = 100,
    query: Optional[str] = None,
    cuisine: Optional[str] = None,
    difficulty: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    min_prep_time: Optional[int] = None,
    max_prep_time: Optional[int] = None,
    min_cook_time: Optional[int] = None,
    max_cook_time: Optional[int] = None,
    servings: Optional[int] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get a list of recipes with optional filtering."""
    # Build ChromaDB filters
    filters = {}
    if cuisine:
        filters["cuisine"] = cuisine
    if difficulty:
        filters["difficulty"] = difficulty
    if tags:
        filters["tags"] = {"$in": tags}
    if min_prep_time is not None:
        filters["prep_time"] = {"$gte": min_prep_time}
    if max_prep_time is not None:
        filters.setdefault("prep_time", {})["$lte"] = max_prep_time
    if min_cook_time is not None:
        filters["cook_time"] = {"$gte": min_cook_time}
    if max_cook_time is not None:
        filters.setdefault("cook_time", {})["$lte"] = max_cook_time
    if servings is not None:
        filters["servings"] = servings

    search_params = RecipeSearch(
        query=query,
        cuisine=cuisine,
        difficulty=difficulty,
        tags=tags,
        min_prep_time=min_prep_time,
        max_prep_time=max_prep_time,
        min_cook_time=min_cook_time,
        max_cook_time=max_cook_time,
        servings=servings
    )
    return await get_recipes(skip=skip, limit=limit, search_params=search_params, filters=filters)

@router.put("/{recipe_id}", response_model=RecipeResponse, summary="Update a recipe")
async def update_existing_recipe(
    recipe_id: str,
    recipe_update: RecipeUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a recipe. Requires authentication and ownership of the recipe."""
    recipe = await get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.author_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this recipe")
    return await update_recipe(recipe_id, recipe_update)

@router.delete("/{recipe_id}", summary="Delete a recipe")
async def delete_existing_recipe(
    recipe_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a recipe. Requires authentication and ownership of the recipe."""
    recipe = await get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.author_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this recipe")
    success = await delete_recipe(recipe_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete recipe")
    return {"message": "Recipe deleted successfully"}

@router.get("/user/{user_id}", response_model=List[RecipeResponse], summary="Get recipes by user")
async def read_user_recipes(
    user_id: str,
    skip: int = 0,
    limit: int = 100
):
    """Get all recipes created by a specific user."""
    return await get_recipes_by_author(user_id, skip=skip, limit=limit)

@router.get("/search/ingredients", response_model=List[RecipeResponse], summary="Search recipes by ingredients")
async def search_by_ingredients(
    ingredients: List[str] = Query(..., description="List of ingredient names to search for"),
    skip: int = 0,
    limit: int = 100,
    cuisine: Optional[str] = None,
    difficulty: Optional[str] = None,
    tags: Optional[List[str]] = Query(None)
):
    """Search for recipes that contain any of the specified ingredients using semantic search."""
    # Build ChromaDB filters
    filters = {}
    if cuisine:
        filters["cuisine"] = cuisine
    if difficulty:
        filters["difficulty"] = difficulty
    if tags:
        filters["tags"] = {"$in": tags}
    
    filters = filters if len(filters) else None
    
    return await search_recipes_by_ingredients(ingredients, skip=skip, limit=limit, filters=filters)

@router.get("/popular", response_model=List[RecipeResponse], summary="Get popular recipes")
async def read_popular_recipes(limit: int = 10):
    """Get the most popular recipes."""
    return await get_popular_recipes(limit=limit)

@router.get("/{recipe_id}/similar", response_model=List[RecipeResponse], summary="Get similar recipes")
async def read_similar_recipes(
    recipe_id: str,
    limit: int = Query(5, description="Number of similar recipes to return"),
    cuisine: Optional[str] = None,
    difficulty: Optional[str] = None,
    tags: Optional[List[str]] = Query(None)
):
    """Get recipes similar to the specified recipe based on semantic similarity."""
    recipe = await get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Build ChromaDB filters
    filters = {}
    if cuisine:
        filters["cuisine"] = cuisine
    if difficulty:
        filters["difficulty"] = difficulty
    if tags:
        filters["tags"] = {"$in": tags}
    
    return await get_similar_recipes(recipe_id, limit=limit, filters=filters)

