from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class IngredientBase(BaseModel):
    """Base ingredient schema"""
    name: str
    quantity: float
    unit: str
    notes: Optional[str] = None

class RecipeBase(BaseModel):
    """Base recipe schema"""
    title: str
    description: Optional[str] = None
    instructions: List[str]
    ingredients: List[IngredientBase]
    prep_time: int = Field(..., description="Preparation time in minutes")
    cook_time: int = Field(..., description="Cooking time in minutes")
    servings: int
    difficulty: str = Field(..., description="easy, medium, or hard")
    cuisine: Optional[str] = None
    tags: List[str] = []

class RecipeCreate(RecipeBase):
    """Schema for recipe creation"""
    pass

class RecipeUpdate(BaseModel):
    """Schema for recipe updates"""
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[List[str]] = None
    ingredients: Optional[List[IngredientBase]] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    cuisine: Optional[str] = None
    tags: Optional[List[str]] = None

class RecipeResponse(RecipeBase):
    """Schema for recipe response"""
    id: str = Field(..., description="The document ID of the recipe")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        # populate_by_name = True

class RecipeSearch(BaseModel):
    """Schema for recipe search parameters"""
    query: Optional[str] = None
    cuisine: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    min_prep_time: Optional[int] = None
    max_prep_time: Optional[int] = None
    min_cook_time: Optional[int] = None
    max_cook_time: Optional[int] = None
    servings: Optional[int] = None 