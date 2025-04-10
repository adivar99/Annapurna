import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

async def test_connection():
    try:
        # Get MongoDB URL from environment
        mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        database_name = os.getenv("DATABASE_NAME", "recipe_db")
        
        # Create client
        client = AsyncIOMotorClient(mongodb_url)
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
        
        # List databases
        databases = await client.list_database_names()
        print("\nAvailable databases:")
        for db in databases:
            print(f"- {db}")
            
        # Close connection
        client.close()
        
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_connection()) 