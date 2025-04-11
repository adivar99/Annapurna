from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from models.recipe import Recipe

class UserBase(BaseModel):
    """Base user schema with common attributes"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None

class UserCreate(UserBase):
    """Schema for user creation"""
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """Schema for user updates"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)

class UserInDB(UserBase):
    """Schema for user in database"""
    id: str
    hashed_password: str
    created_at: datetime
    updated_at: datetime
    saved_recipes: List[str] = []  # List of recipe IDs

class UserResponse(UserBase):
    """Schema for user response"""
    created_at: datetime
    updated_at: datetime
    saved_recipes: List[str] = []

class Token(BaseModel):
    """Schema for JWT token"""
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    """Schema for token data"""
    username: Optional[str] = None 