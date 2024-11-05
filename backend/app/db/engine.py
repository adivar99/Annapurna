from pymongo import MongoClient

from core.settings import settings

print(settings.DATABASE_URL)

client = MongoClient(f"{settings.DATABASE_URL}/{settings.DATABASE_NAME}")
database = client[settings.DATABASE_NAME]
