from fastapi import APIRouter, Depends, HTTPException
from typing import List

from crud import recipe
from db.engine import database
from utils.utils import get_db
from models import Recipe, RecipeCreate, RecipeUpdate

router = APIRouter()

@router.get("/", response_model=List[Recipe])
async def list_recipes(db = Depends(get_db)):
    print(f"in list_recipes db: {db}")
    return recipe.list_recipes(db)

@router.post("/", response_model=Recipe)
async def create_recipe(recipe: RecipeCreate, db = Depends(get_db)):
    return recipe.create_recipe(db, recipe)

@router.get("/{id}", response_model=Recipe)
async def get_recipe(id: str, db = Depends(get_db)):
    return recipe.get_recipe(db, id)

@router.put("/{id}", response_model=Recipe)
async def update_recipe(id: str, recipe: RecipeUpdate, db = Depends(get_db)):
    return recipe.update_recipe(db, id, recipe)

@router.delete("/{id}")
async def delete_recipe(id: str, db = Depends(get_db)):
    return recipe.delete_recipe(db, id)
