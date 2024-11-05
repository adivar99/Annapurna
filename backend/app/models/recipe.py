from pydantic import BaseModel  
from typing import List, Optional


class RecipeIngredient(BaseModel):
    id: int
    name: str
    quantity: str
    unit: str

class RecipeStep(BaseModel):
    id: int
    order: int
    instruction: str

class RecipeBase(BaseModel):
    name: str
    cuisine: str
    cooking_time: int
    servings: int
    ingredients: List[RecipeIngredient]
    steps: List[RecipeStep]
    source: Optional[str]
    notes: Optional[List[str]]
    tags: Optional[List[str]]

class RecipeUpdate(RecipeBase):
    pass

class RecipeCreate(RecipeBase):
    pass

class Recipe(RecipeBase):
    id: str