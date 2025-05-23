from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from models.chat_session import ChatSession
from models.user import User
from models.recipe import Recipe
from schemas.chat import MessageCreate, ChatSessionResponse, ChatSessionListResponse
from utils import convert_recipe_to_response
from bson import ObjectId

async def create_chat_session(user: User, recipe: Recipe) -> ChatSession:
    """Create a new chat session"""
    session = ChatSession(
        user=user,
        recipe=recipe,
        messages=[],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=10)
    )
    await session.insert()
    return session

async def get_chat_session(session_id: str) -> Optional[ChatSession]:
    """Get a specific chat session by ID"""
    return await ChatSession.get(session_id)

async def get_session_by_recipe(user: User, recipe_id: str):
    print(f"Finding session with user: {user.id} and recipe: {recipe_id}")
    # test = await ChatSession.find(ChatSession.recipe.id == ObjectId(recipe_id)).to_list()
    # print(f"{test=}")
    return await ChatSession.find(
        ChatSession.user.id == user.id,
    ).find(
        ChatSession.recipe.id == ObjectId(recipe_id)
    ).first_or_none()


async def get_user_sessions(user: User) -> List[ChatSession]:
    """Get all active chat sessions for a user"""
    return await ChatSession.find(
        ChatSession.user == user,
        ChatSession.expires_at > datetime.utcnow()
    ).sort(-ChatSession.updated_at).to_list()

async def update_chat_session(
    session: ChatSession,
    update_data: Dict[str, Any]
) -> Optional[ChatSession]:
    """Update a chat session with the given data"""
    for key, value in update_data.items():
        if hasattr(session, key):
            setattr(session, key, value)
    session.updated_at = datetime.utcnow()
    await session.save()
    return session

async def update_messages(
    session: ChatSession,
    messages: List[MessageCreate]
) -> ChatSession:
    """Update all messages in the chat session"""
    session.messages = [
        {
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp or datetime.utcnow()
        }
        for msg in messages
    ]
    session.updated_at = datetime.utcnow()
    await session.save()
    return session

async def add_message(
    session: ChatSession,
    sender: str,
    text: str
) -> None:
    """Add a message to the chat session"""
    session.messages.append({
        "sender": sender,
        "text": text,
        "timestamp": datetime.utcnow()
    })
    session.updated_at = datetime.utcnow()
    await session.save()
    # return session

async def clear_messages(session: ChatSession) -> ChatSession:
    """Clear all messages from the chat session"""
    session.messages = []
    session.updated_at = datetime.utcnow()
    await session.save()
    return session

async def delete_chat_session(session: ChatSession) -> bool:
    """Delete a chat session"""
    await session.delete()
    return True

async def to_response(session: ChatSession) -> ChatSessionResponse:
    """Convert the chat session to a Pydantic response model"""
    print(session)
    recipe = await session.recipe.fetch()
    user = await session.user.fetch()

    return ChatSessionResponse(
        session_id=str(session.id),
        recipe_id=str(recipe.id),
        messages=session.messages,
        recipe=convert_recipe_to_response(recipe),
        user=user,
        created_at=session.created_at,
        updated_at=session.updated_at,
        expires_at=session.expires_at
    )

async def to_list_response(session: ChatSession) -> ChatSessionListResponse:
    """Convert the chat session to a list response model"""
    recipe = await session.recipe.fetch()
    
    return ChatSessionListResponse(
        session_id=str(session.id),
        recipe_id=str(recipe.id),
        recipe_title=recipe.title,
        last_message=session.messages[-1].text if session.messages else None,
        updated_at=session.updated_at
    )
