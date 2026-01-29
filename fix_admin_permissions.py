"""
Script to fix admin role permissions to use granular permissions.
This ensures the admin role has all necessary permissions to manage users and roles.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def fix_admin_permissions():
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongodb_uri)
    db = client.jewellery_erp
    
    print("Connecting to database...")
    
    # Define the complete permission structure for Admin role
    admin_permissions = {
        "dashboard": {"view": True},
        "inventory": {"view": True, "create": True, "edit": True, "delete": True},
        "stock_ledger": {"view": True, "export": True},
        "stock_adjustment": {"view": True, "create": True, "approve": True, "reject": True},
        "categories": {"view": True, "create": True, "edit": True, "delete": True},
        "transactions": {"view": True, "create": True, "edit": True, "delete": True},
        "invoices": {"view": True, "create": True, "edit": True, "delete": True, "print": True},
        "customers": {"view": True, "create": True, "edit": True, "delete": True},
        "sellers": {"view": True, "create": True, "edit": True, "delete": True},
        "accounts": {"view": True, "create": True, "edit": True, "delete": True},
        "expenses": {"view": True, "create": True, "edit": True, "delete": True},
        "reports": {"view": True, "export": True},
        "users": {"view": True, "create": True, "edit": True, "delete": True},
        "roles": {"view": True, "create": True, "edit": True, "delete": True},
        "settings": {"view": True, "edit": True},
    }
    
    # Find the Admin role
    admin_role = await db.roles.find_one({"name": "Admin"}, {"_id": 0})
    
    if not admin_role:
        print("❌ Admin role not found in database!")
        print("Please ensure the Admin role exists before running this script.")
        client.close()
        return
    
    print(f"✓ Found Admin role (ID: {admin_role['id']})")
    print(f"  Current permissions: {len([p for module in admin_role.get('permissions', {}).values() for p in module.values() if p])} enabled")
    
    # Update the Admin role with complete permissions
    result = await db.roles.update_one(
        {"name": "Admin"},
        {"$set": {"permissions": admin_permissions}}
    )
    
    if result.modified_count > 0:
        print("✓ Admin role permissions updated successfully!")
        print(f"  New permissions: {len([p for module in admin_permissions.values() for p in module.values() if p])} enabled")
    else:
        print("ℹ Admin role already has the correct permissions (no changes needed)")
    
    # Verify the update
    updated_role = await db.roles.find_one({"name": "Admin"}, {"_id": 0})
    
    print("\n📋 Admin Role Permission Summary:")
    for module, perms in updated_role['permissions'].items():
        enabled_perms = [action for action, enabled in perms.items() if enabled]
        if enabled_perms:
            print(f"  • {module}: {', '.join(enabled_perms)}")
    
    # Check if there are any admin users
    admin_users = await db.users.find({"role_id": admin_role['id']}, {"_id": 0, "password": 0}).to_list(100)
    
    if admin_users:
        print(f"\n👥 Found {len(admin_users)} admin user(s):")
        for user in admin_users:
            print(f"  • {user['name']} ({user['email']})")
    else:
        print("\n⚠ Warning: No users found with Admin role!")
    
    client.close()
    print("\n✅ Done! Admin users can now manage users and roles.")

if __name__ == "__main__":
    asyncio.run(fix_admin_permissions())
