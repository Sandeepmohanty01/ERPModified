from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import jwt
from backend.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.ALGORITHM
security = HTTPBearer()

def hash_password(password: str) -> str:
    # Bcrypt has a 72-byte limit, truncate password to 72 characters
    # (since most characters are 1 byte in UTF-8, this is a safe approximation)
    truncated_password = password[:72]
    return pwd_context.hash(truncated_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Bcrypt has a 72-byte limit, truncate password to 72 characters
    # (since most characters are 1 byte in UTF-8, this is a safe approximation)

    truncated_password = plain_password[:72]
    return pwd_context.verify(truncated_password, hashed_password)
    

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from backend.shared.database import get_database
    db = get_database()
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Load role and permissions
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        user["permissions"] = role.get("permissions", {}) if role else {}
        user["role_name"] = role.get("name", "Unknown") if role else "Unknown"
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_permission(user_permissions: dict, required_permission: str) -> bool:
    """Check if user has a specific permission.
    
    Args:
        user_permissions: User's permissions dict (e.g., {"inventory": {"create": True}})
        required_permission: Required permission in dot notation (e.g., "inventory.create")
    
    Returns:
        True if user has permission, False otherwise
    """
    parts = required_permission.split(".")
    current = user_permissions
    
    for part in parts:
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    
    return current is True

def require_permission(permission: str):
    """Dependency to check if current user has required permission.
    
    Args:
        permission: Required permission in dot notation (e.g., "inventory.create")
    
    Returns:
        Dependency function that raises 403 if permission denied
    """
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        if not check_permission(current_user.get("permissions", {}), permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Only admin can perform this action. Your role is: {current_user.get('role_name', 'Unknown')}"
            )
        return current_user
    return permission_checker
