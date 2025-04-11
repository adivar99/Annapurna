from pydantic import BaseModel
from typing import List, Optional

class IngredientBase(BaseModel):
    name: str
    unit: Optional[str] = None

class IngredientCreate(IngredientBase):
    pass

class Ingredient(IngredientBase):
    id: int

    class Config:
        from_attributes = True

class RecipeBase(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: str
    prep_time: int
    cook_time: int
    servings: int
    difficulty: str
    cuisine: Optional[str] = None

class RecipeCreate(RecipeBase):
    ingredients: List[IngredientCreate]

class Recipe(RecipeBase):
    id: int
    ingredients: List[Ingredient]

    class Config:
        from_attributes = True 