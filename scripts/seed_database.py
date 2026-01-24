#!/usr/bin/env python3
"""
Seed script for Jewellery ERP
Creates default roles and admin user for initial setup
"""

import asyncio
import sys
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    print(f"Connecting to {mongo_url}/{db_name}...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if admin role exists
    existing_role = await db.roles.find_one({"name": "Admin"})
    if existing_role:
        print("✓ Admin role already exists")
        role_id = existing_role["id"]
    else:
        # Create Admin role
        role_id = str(uuid.uuid4())
        admin_role = {
            "id": role_id,
            "name": "Admin",
            "description": "Full system access with all permissions",
            "permissions": {
                "dashboard": {"view": True},
                "inventory": {"view": True, "create": True, "edit": True, "delete": True},
                "stock_ledger": {"view": True, "export": True},
                "stock_adjustment": {"view": True, "create": True, "approve": True, "reject": True},
                "transactions": {"view": True, "create": True, "delete": True},
                "invoices": {"view": True, "create": True, "delete": True},
                "customers": {"view": True, "create": True, "edit": True, "delete": True},
                "sellers": {"view": True, "create": True, "edit": True, "delete": True},
                "users": {"view": True, "create": True, "edit": True, "delete": True},
                "roles": {"view": True, "create": True, "edit": True, "delete": True},
                "expenses": {"view": True, "create": True, "delete": True}
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(admin_role)
        print("✓ Created Admin role")
    
    # Check if admin user exists
    existing_user = await db.users.find_one({"email": "admin@jewellery.com"})
    if existing_user:
        print("✓ Admin user already exists")
    else:
        # Create Admin user
        hashed_password = pwd_context.hash("admin123")
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@jewellery.com",
            "name": "System Admin",
            "password": hashed_password,
            "role_id": role_id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print("✓ Created Admin user")
        print("  Email: admin@jewellery.com")
        print("  Password: admin123")
    
    # Create sample category if none exists
    existing_category = await db.categories.find_one({})
    if not existing_category:
        categories = [
            {"id": str(uuid.uuid4()), "name": "Rings", "description": "All types of rings", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Necklaces", "description": "Necklaces and chains", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Earrings", "description": "Earrings and studs", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Bracelets", "description": "Bracelets and bangles", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.categories.insert_many(categories)
        print(f"✓ Created {len(categories)} sample categories")
    else:
        print("✓ Categories already exist")
    
    client.close()
    print("\n✓ Database seeding complete!")
    print("\nYou can now login with:")
    print("  Email: admin@jewellery.com")
    print("  Password: admin123")

if __name__ == "__main__":
    asyncio.run(seed_database())
