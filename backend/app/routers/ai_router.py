from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
import os
import httpx

from models.user import User
from models.recipe import Recipe
from schemas.recipe import RecipeResponse
from ai_service import RecipeAIService
from crud.recipe import create_recipe
from core.deps import get_current_active_user
from crud import chat_sessions

router = APIRouter()
ai_service = RecipeAIService()

@router.post("/chat")
async def chat(message: str, context: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)):
    try:
        response = await ai_service.chat(message, context)
        return {"response": response, "recipe_id": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/realtime/session")
async def create_realtime_session(
    current_user: User = Depends(get_current_active_user),
):
    """
    Create an ephemeral client key for browser Realtime connections.
    Returns a short-lived token that the browser can use to connect via WebRTC.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing OPENAI_API_KEY")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-realtime-preview-2025-06-03",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            client_secret = (
                data.get("client_secret", {}).get("value") if isinstance(data, dict) else None
            )
            if not client_secret:
                raise HTTPException(status_code=500, detail="Failed to obtain client token")
            return {"client_secret": client_secret}
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Upstream error: {str(exc)}")

@router.post("/generate-recipe-suggestions")
async def generate_recipe_suggestions(
    ingredients: List[str],
    preferences: Optional[Dict] = None,
    current_user: User = Depends(get_current_active_user)
    ):
    try:
        suggestions = await ai_service.generate_recipe_suggestions(ingredients, preferences)
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ask-recipe-question")
async def ask_recipe_question(recipe: Recipe, question: List[str],
    current_user: User = Depends(get_current_active_user)):
    try:
        print("In ask-recipe-questions")
        session = await chat_sessions.get_session_by_recipe(current_user, recipe.id)
        if session is None:
            print("Creating new session")
            session = await chat_sessions.create_chat_session(current_user, recipe)
            await chat_sessions.add_message(session, sender='ai', text=f"Let's talk about how to cook {recipe.title}")
        answer = await ai_service.ask_recipe_question(recipe, question)
        await chat_sessions.add_message(session, sender='user', text=question[0])
        await chat_sessions.add_message(session, sender='ai', text=answer['response'])
        return answer
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-recipe")
async def analyze_recipe(recipe: Recipe,
    current_user: User = Depends(get_current_active_user)):
    try:
        analysis = await ai_service.analyze_recipe(recipe)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/personalize-recipe")
async def personalize_recipe(recipe: Recipe, dietary_restrictions: Optional[List[str]] = None,
    current_user: User = Depends(get_current_active_user)):
    try:
        personalized = await ai_service.personalize_recipe(recipe, get_current_active_user, dietary_restrictions)
        return personalized
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-shopping-list")
async def generate_shopping_list(recipe: Recipe, servings: Optional[int] = None):
    try:
        shopping_list = await ai_service.generate_shopping_list(recipe, servings)
        return shopping_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggest-recipe-modifications")
async def suggest_recipe_modifications(recipe: Recipe, modification_type: str):
    try:
        modifications = await ai_service.suggest_recipe_modifications(recipe, modification_type)
        return modifications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-recipe-timeline")
async def generate_recipe_timeline(recipe: Recipe):
    try:
        timeline = await ai_service.generate_recipe_timeline(recipe)
        return timeline
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-user-preferences")
async def analyze_user_preferences(user: User, saved_recipes: List[Recipe]):
    try:
        analysis = await ai_service.analyze_user_preferences(user, saved_recipes)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/find-similar-recipes")
async def find_similar_recipes(recipe_id: str, limit: int = 5, filters: Optional[Dict] = None):
    try:
        recipe = await Recipe.get(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        similar_recipes = await ai_service.find_similar_recipes(recipe, limit, filters)
        return similar_recipes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/find-recipes-by-semantic-search")
async def find_recipes_by_semantic_search(query: str, limit: int = 5, filters: Optional[Dict] = None):
    try:
        recipes = await ai_service.find_recipes_by_semantic_search(query, limit, filters)
        return recipes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/find-recipes-by-ingredients-semantic")
async def find_recipes_by_ingredients_semantic(ingredients: List[str], limit: int = 5, filters: Optional[Dict] = None):
    try:
        recipes = await ai_service.find_recipes_by_ingredients_semantic(ingredients, limit, filters)
        return recipes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/find-recipes-by-filters")
async def find_recipes_by_filters(filters: Dict, limit: int = 5):
    try:
        recipes = await ai_service.find_recipes_by_filters(filters, limit)
        return recipes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/parse", response_model=RecipeResponse, summary="Parse a recipe from text")
async def parse_recipe(
    recipe_text: str,
    current_user: User = Depends(get_current_active_user)
):
    """Parse a recipe from text and return a structured recipe object."""
    parsed_recipe = await ai_service.parse_new_recipe(recipe_text)
    return await create_recipe(parsed_recipe, author_id=str(current_user.id))