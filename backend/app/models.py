from beanie import Document, Indexed
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str
    notes: Optional[str] = None

class Recipe(Document):
    title: Indexed(str)
    description: Optional[str] = None
    instructions: List[str]
    ingredients: List[Ingredient]
    prep_time: int  # in minutes
    cook_time: int  # in minutes
    servings: int
    difficulty: str  # easy, medium, hard
    cuisine: Optional[str] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "recipes"
        indexes = [
            [("title", "text"), ("description", "text"), ("tags", "text")],
            [("cuisine", 1)],
            [("difficulty", 1)],
            [("created_at", -1)]
        ]

    class Config:
        schema_extra = {
            "example": {
                "title": "Classic Spaghetti Carbonara",
                "description": "A traditional Italian pasta dish with eggs, cheese, pancetta, and black pepper",
                "instructions": [
                    "Bring a large pot of salted water to boil",
                    "Cook spaghetti according to package instructions",
                    "In a separate pan, cook pancetta until crispy",
                    "Mix eggs and cheese in a bowl",
                    "Combine all ingredients and serve immediately"
                ],
                "ingredients": [
                    {
                        "name": "spaghetti",
                        "quantity": 400,
                        "unit": "g"
                    },
                    {
                        "name": "pancetta",
                        "quantity": 150,
                        "unit": "g"
                    }
                ],
                "prep_time": 10,
                "cook_time": 15,
                "servings": 4,
                "difficulty": "medium",
                "cuisine": "Italian",
                "tags": ["pasta", "italian", "quick-meal"]
            }
        } 