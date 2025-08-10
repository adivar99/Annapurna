from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
import os
import httpx

from models.user import User
from models.recipe import Recipe
from schemas.recipe import RecipeResponse
from ai.ai_service import RecipeAIService
from ai.embedding import EmbeddingService
from crud.recipe import create_recipe
from core.deps import get_current_active_user
from crud import chat_sessions

router = APIRouter()
ai_service = RecipeAIService()
embedding_service = EmbeddingService()

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

@router.post("/semantic-search")
async def semantic_search(
    query: str, limit: int = 5,
    current_user: User = Depends(get_current_active_user),
    ):
    try:
        recipes = await embedding_service.find_recipe_by_semantic_search(query, limit)
        return recipes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))