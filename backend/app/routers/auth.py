from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from datetime import timedelta
from typing import List, Any

from core.deps import get_current_active_user
from core.auth import (
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    verify_password
)
from models.user import User
from schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate,
    Token
)
from crud.user import (
    create_user,
    get_user_by_username,
    get_user_by_email,
    update_user,
    delete_user,
    save_recipe_for_user,
    unsave_recipe_for_user,
    get_user_saved_recipes
)
from crud import recipe as crud_recipe
from models.recipe import Recipe
from schemas.recipe import RecipeResponse
from utils import convert_recipe_to_response

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    """
    Register a new user.
    """

    # Check if username or email already exists
    if await get_user_by_username(user.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    if await get_user_by_email(user.email):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    db_user = await create_user(user)
    return db_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login user and return access token.
    """
    user = await get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    response = JSONResponse(content={
            "access_token": access_token,
            "token_type": "bearer",
        },
        status_code=200)
    response.set_cookie(
        key="Authorization",
        value=f"Bearer {access_token}",
        httponly=True,
    )
    return response

@router.get('/login')
def auto_login(
    current_user: User = Depends(get_current_active_user)
):
    return True

@router.post("/logout", response_model=Token)
def login_logout(current_user: User = Depends(get_current_active_user)) -> Any:
    """
    set access-token to expired date.
    """
    response = JSONResponse(content={},status_code=200)
    response.delete_cookie("Authorization")
    return response

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information.
    """
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update current user information.
    """
    updated_user = await update_user(str(current_user.id), user_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@router.delete("/me")
async def delete_user_me(current_user: User = Depends(get_current_active_user)):
    """
    Delete current user.
    """
    success = await delete_user(str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@router.post("/me/save-recipe/{recipe_id}")
async def save_recipe(
    recipe_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Save a recipe for the current user.
    """
    # Check if recipe exists
    recipe = await Recipe.get(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    updated_user = await save_recipe_for_user(str(current_user.id), recipe_id)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Recipe saved successfully"}

@router.delete("/me/save-recipe/{recipe_id}")
async def unsave_recipe(
    recipe_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove a saved recipe for the current user.
    """
    updated_user = await unsave_recipe_for_user(str(current_user.id), recipe_id)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Recipe unsaved successfully"}

@router.get("/me/save-recipe", response_model=List)
async def get_saved_recipes(current_user: User = Depends(get_current_active_user)):
    """
    Get all saved recipe ids for the current user.
    """
    saved_recipe_ids = await get_user_saved_recipes(str(current_user.id))
    return saved_recipe_ids

@router.get("/me/saved-recipes", response_model=List[RecipeResponse])
async def get_saved_recipes(current_user: User = Depends(get_current_active_user)):
    """
    Get all saved recipes for the current user.
    """
    saved_recipe_ids = await get_user_saved_recipes(str(current_user.id))
    print(f"{saved_recipe_ids=}")
    recipes = await crud_recipe.get_recipes_by_ids(saved_recipe_ids)
    return [convert_recipe_to_response(rec) for rec in recipes]