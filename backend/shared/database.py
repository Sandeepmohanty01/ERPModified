from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

mongo_url = settings.MONGO_URL
db_name = settings.DB_NAME

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

def get_database():
    return db

def close_database():
    client.close()
