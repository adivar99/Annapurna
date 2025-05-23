from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from typing import List
import os
from dotenv import load_dotenv
from models.recipe import Recipe, Ingredient
from models.user import User
from models.chat_session import ChatSession

load_dotenv()

MONGO_USER = os.getenv("MONGO_USER")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD")
MONGO_CLUSTER = os.getenv("MONGO_CLUSTER")
MONGO_URI = f"mongodb+srv://{MONGO_USER}:{MONGO_PASSWORD}@{MONGO_CLUSTER}"
DB_NAME = os.getenv("DB_NAME")
DATABASE_NAME = os.getenv("DB_NAME", "annapurna")

async def init_db():
    # Create Motor client
    client = AsyncIOMotorClient(MONGO_URI)
    
    # Initialize beanie with the document classes
    await init_beanie(
        database=client[DATABASE_NAME],
        document_models=[
            Recipe,
            Ingredient,
            User,
            ChatSession
        ]
    ) 