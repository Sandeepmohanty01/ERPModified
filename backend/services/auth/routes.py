from fastapi import APIRouter, HTTPException, Depends
from shared.database import get_database
from shared.auth import hash_password, verify_password, create_access_token, get_current_user
from shared.models import User, UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
db = get_database()

@router.post("/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    role = await db.roles.find_one({"id": user_data.role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")
    
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        role_id=user_data.role_id
    )
    user_dict = user.model_dump()
    user_dict["password"] = hashed_password
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token(data={"sub": user.id})
    return {"token": token, "user": UserResponse(**user.model_dump())}

@router.post("/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    token = create_access_token(data={"sub": user["id"]})
    user.pop("password")
    return {"token": token, "user": user}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
