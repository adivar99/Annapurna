from datetime import datetime
from typing import List, Optional
from beanie import Document, Link
from pydantic import BaseModel
from models.recipe import Recipe
from models.user import User
from schemas.chat import ChatSessionResponse, MessageCreate

class Message(BaseModel):
    sender: str  # 'user' or 'ai'
    text: str
    timestamp: datetime

    class Config:
        arbitrary_types_allowed = True

class ChatSession(Document):
    user: Link[User]
    recipe: Link[Recipe]
    messages: List[Message]
    created_at: datetime
    updated_at: datetime
    expires_at: datetime

    class Settings:
        name = "chat_sessions"
        indexes = [
            "user",
            "recipe",
            "created_at",
            "expires_at"
        ]

    @classmethod
    async def create_session(cls, user: User, recipe: Recipe) -> "ChatSession":
        """Create a new chat session"""
        from datetime import timedelta
        
        session = cls(
            user=user,
            recipe=recipe,
            messages=[],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=10)
        )
        await session.insert()
        return session

    async def add_message(self, sender: str, text: str):
        """Add a message to the chat session"""
        self.messages.append(Message(
            sender=sender,
            text=text,
            timestamp=datetime.utcnow()
        ))
        self.updated_at = datetime.utcnow()
        await self.save()

    async def update_messages(self, messages: List[MessageCreate]):
        """Update all messages in the chat session"""
        self.messages = [
            Message(
                sender=msg.sender,
                text=msg.text,
                timestamp=msg.timestamp or datetime.utcnow()
            )
            for msg in messages
        ]
        self.updated_at = datetime.utcnow()
        await self.save()

    async def clear_messages(self):
        """Clear all messages from the chat session"""
        self.messages = []
        self.updated_at = datetime.utcnow()
        await self.save()

    @classmethod
    async def get_user_sessions(cls, user: User) -> List["ChatSession"]:
        """Get all active chat sessions for a user"""
        return await cls.find(
            cls.user == user,
            cls.expires_at > datetime.utcnow()
        ).sort(-cls.updated_at).to_list()

    @classmethod
    async def get_session(cls, session_id: str) -> Optional["ChatSession"]:
        """Get a specific chat session by ID"""
        return await cls.get(session_id)

    @classmethod
    async def update_session(cls, session_id: str, update_data: dict) -> Optional["ChatSession"]:
        """Update a chat session with the given data"""
        session = await cls.get(session_id)
        if session:
            for key, value in update_data.items():
                if hasattr(session, key):
                    setattr(session, key, value)
            session.updated_at = datetime.utcnow()
            await session.save()
        return session

    async def delete(self):
        """Delete the chat session"""
        await super().delete()

    async def to_response(self) -> ChatSessionResponse:
        """Convert the chat session to a Pydantic response model"""
        # Fetch the linked recipe and user
        recipe = await self.recipe.fetch()
        user = await self.user.fetch()

        return ChatSessionResponse(
            session_id=str(self.id),
            recipe_id=str(recipe.id),
            messages=[
                {
                    "sender": msg.sender,
                    "text": msg.text,
                    "timestamp": msg.timestamp
                }
                for msg in self.messages
            ],
            recipe=recipe,
            user=user,
            created_at=self.created_at,
            updated_at=self.updated_at,
            expires_at=self.expires_at
        ) 