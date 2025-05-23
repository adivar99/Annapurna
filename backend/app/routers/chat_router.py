from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from models.user import User
from models.recipe import Recipe
from crud import chat_sessions
from schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionListResponse,
    MessageCreate,
    MessageResponse,
    ChatSessionUpdate
)
from core.deps import get_current_active_user
from datetime import datetime

router = APIRouter()

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    recipe_id: str = Body(..., embed=True),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new chat session for a recipe"""
    recipe = await Recipe.get(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    session = await chat_sessions.create_chat_session(current_user, recipe)
    return await chat_sessions.to_response(session)

@router.get("/sessions", response_model=List[ChatSessionListResponse])
async def get_chat_sessions(
    current_user: User = Depends(get_current_active_user)
):
    """Get all active chat sessions for the current user"""
    sessions = await chat_sessions.get_user_sessions(current_user)
    return [await chat_sessions.to_list_response(session) for session in sessions]

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific chat session"""
    session = await chat_sessions.get_chat_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if str(session.user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat session")
    
    return await chat_sessions.to_response(session)

@router.get("/recipe", response_model=Optional[ChatSessionResponse])
async def get_session_by_recipe(
    recipe_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a chat session based on the current user and recipe"""
    session = await chat_sessions.get_session_by_recipe(current_user, recipe_id)
    if not session:
        return None
    
    return await chat_sessions.to_response(session)


@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_chat_session(
    session_id: str,
    update_data: ChatSessionUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a chat session"""
    session = await chat_sessions.get_chat_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if str(session.user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat session")
    
    session = await chat_sessions.update_messages(session, update_data.messages)
    return await chat_sessions.to_response(session)

@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
async def add_message(
    session_id: str,
    message: str = Body(..., embed=True),
    current_user: User = Depends(get_current_active_user)
):
    """Add a message to a chat session"""
    session = await chat_sessions.get_chat_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    db_user = await session.user.fetch()
    if str(db_user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat session")
    
    session = await chat_sessions.add_message(session, "user", message)
    return session.messages[-1]

@router.delete("/sessions/{session_id}/messages")
async def clear_messages(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Clear all messages from a chat session"""
    session = await chat_sessions.get_chat_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if str(session.user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat session")
    
    await chat_sessions.clear_messages(session)
    return {"status": "success"}

@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a chat session"""
    session = await chat_sessions.get_chat_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    session_user = await session.user.fetch()
    if str(session_user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat session")
    
    await chat_sessions.delete_chat_session(session)
    return {"status": "success"} 