from beanie import Document, Indexed
from pydantic import EmailStr, Field
from typing import List, Optional
from datetime import datetime

class User(Document):
    """User model for MongoDB"""
    email: Indexed(EmailStr, unique=True)
    username: Indexed(str, unique=True)
    full_name: Optional[str] = None
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    saved_recipes: List[str] = []  # List of recipe IDs

    class Settings:
        name = "users"
        indexes = [
            [("email", 1)],
            [("username", 1)],
            [("created_at", -1)]
        ]

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "saved_recipes": []
            }
        } 