from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
from backend.shared.database import get_database
from backend.shared.auth import get_current_user, hash_password, require_permission
from backend.shared.models import Role, RoleCreate, UserResponse

router = APIRouter(prefix="/api", tags=["Users & Roles"])
db = get_database()

# ========== ROLE ROUTES ==========

@router.post("/roles", response_model=Role)
async def create_role(role_data: RoleCreate, current_user: dict = Depends(require_permission("users.manage"))):
    role = Role(**role_data.model_dump())
    role_dict = role.model_dump()
    role_dict["created_at"] = role_dict["created_at"].isoformat()
    await db.roles.insert_one(role_dict)
    return role

@router.get("/roles", response_model=List[Role])
async def get_roles(current_user: dict = Depends(require_permission("users.view"))):
    roles = await db.roles.find({}, {"_id": 0}).to_list(1000)
    for role in roles:
        if isinstance(role["created_at"], str):
            role["created_at"] = datetime.fromisoformat(role["created_at"])
    return roles

@router.get("/roles/{role_id}", response_model=Role)
async def get_role(role_id: str, current_user: dict = Depends(require_permission("users.view"))):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if isinstance(role["created_at"], str):
        role["created_at"] = datetime.fromisoformat(role["created_at"])
    return role

@router.put("/roles/{role_id}", response_model=Role)
async def update_role(role_id: str, role_data: RoleCreate, current_user: dict = Depends(require_permission("users.manage"))):
    existing_role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not existing_role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    update_data = role_data.model_dump()
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    
    updated_role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if isinstance(updated_role["created_at"], str):
        updated_role["created_at"] = datetime.fromisoformat(updated_role["created_at"])
    return updated_role

@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: dict = Depends(require_permission("users.manage"))):
    result = await db.roles.delete_one({"id": role_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role deleted successfully"}

# ========== USER ROUTES ==========

@router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_permission("users.view"))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(require_permission("users.view"))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}")
async def update_user(user_id: str, name: Optional[str] = None, role_id: Optional[str] = None, 
                     is_active: Optional[bool] = None, current_user: dict = Depends(require_permission("users.manage"))):
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if role_id is not None:
        role = await db.roles.find_one({"id": role_id}, {"_id": 0})
        if not role:
            raise HTTPException(status_code=400, detail="Role not found")
        update_data["role_id"] = role_id
    if is_active is not None:
        update_data["is_active"] = is_active
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_permission("users.manage"))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}
