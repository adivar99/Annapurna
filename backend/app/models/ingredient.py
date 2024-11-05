from pydantic import BaseModel
from typing import List

class IngredientBase(BaseModel):
    name: str
    nutrition_info: dict
    allergens: List[str]

class IngredientUpdate(IngredientBase):
    pass

class IngredientCreate(IngredientBase):
    pass

class Ingredient(IngredientBase):
    id: str 