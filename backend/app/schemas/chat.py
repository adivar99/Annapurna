from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from schemas.recipe import RecipeResponse
from schemas.user import UserResponse

class MessageBase(BaseModel):
    sender: str = Field(..., description="The sender of the message ('user' or 'ai')")
    text: str = Field(..., description="The content of the message")
    timestamp: datetime = Field(..., description="When the message was sent")

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ChatSessionBase(BaseModel):
    recipe_id: str = Field(..., description="ID of the recipe this chat is about")
    messages: List[MessageCreate] = Field(default_factory=list, description="List of messages in the chat")

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionUpdate(BaseModel):
    messages: List[MessageCreate] = Field(..., description="Updated list of messages")

class ChatSessionResponse(ChatSessionBase):
    session_id: str = Field(..., description="Unique identifier for the chat session")
    recipe: RecipeResponse = Field(..., description="The recipe this chat is about")
    user: UserResponse = Field(..., description="The user who owns this chat session")
    created_at: datetime = Field(..., description="When the chat session was created")
    updated_at: datetime = Field(..., description="When the chat session was last updated")
    expires_at: datetime = Field(..., description="When the chat session will expire")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ChatSessionListResponse(BaseModel):
    session_id: str = Field(..., description="Unique identifier for the chat session")
    recipe_id: str = Field(..., description="ID of the recipe this chat is about")
    recipe_title: str = Field(..., description="Title of the recipe")
    last_message: Optional[str] = Field(None, description="The last message in the chat")
    updated_at: datetime = Field(..., description="When the chat session was last updated")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        } 