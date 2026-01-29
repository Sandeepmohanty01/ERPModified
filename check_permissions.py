import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check_admin_permissions():
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
    db = client.jewellery_erp
    
    # Get all roles
    print("=== ALL ROLES ===")
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    for role in roles:
        print(f"\nRole: {role.get('name')}")
        print(f"ID: {role.get('id')}")
        print(f"Permissions: {role.get('permissions')}")
    
    # Get admin user
    print("\n\n=== ADMIN USER ===")
    admin = await db.users.find_one({"email": "admin@example.com"}, {"_id": 0, "password": 0})
    if admin:
        print(f"Admin user found: {admin}")
        role = await db.roles.find_one({"id": admin.get("role_id")}, {"_id": 0})
        print(f"Admin role: {role}")
    else:
        print("No admin user found")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_admin_permissions())
