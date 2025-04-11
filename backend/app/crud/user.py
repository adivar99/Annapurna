from typing import Optional, List
from models.user import User
from schemas.user import UserCreate, UserUpdate
from core.auth import get_password_hash
from datetime import datetime

async def get_user_by_email(email: str) -> Optional[User]:
    """Get user by email"""
    return await User.find_one({"email": email})

async def get_user_by_username(username: str) -> Optional[User]:
    """Get user by username"""
    return await User.find_one({"username": username})

async def create_user(user: UserCreate) -> User:
    """Create new user"""
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    await db_user.insert()
    return db_user

async def update_user(user_id: str, user_update: UserUpdate) -> Optional[User]:
    """Update user"""
    db_user = await User.get(user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    update_data["updated_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    await db_user.save()
    return db_user

async def delete_user(user_id: str) -> bool:
    """Delete user"""
    user = await User.get(user_id)
    if user:
        await user.delete()
        return True
    return False

async def save_recipe_for_user(user_id: str, recipe_id: str) -> Optional[User]:
    """Save a recipe for a user"""
    user = await User.get(user_id)
    if not user:
        return None
    
    if recipe_id not in user.saved_recipes:
        user.saved_recipes.append(recipe_id)
        await user.save()
    
    return user

async def unsave_recipe_for_user(user_id: str, recipe_id: str) -> Optional[User]:
    """Remove a saved recipe for a user"""
    user = await User.get(user_id)
    if not user:
        return None
    
    if recipe_id in user.saved_recipes:
        user.saved_recipes.remove(recipe_id)
        await user.save()
    
    return user

async def get_user_saved_recipes(user_id: str) -> List[str]:
    """Get list of saved recipe IDs for a user"""
    user = await User.get(user_id)
    if not user:
        return []
    return user.saved_recipes 