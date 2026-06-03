import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # Truncate password to 72 bytes to avoid bcrypt errors
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Truncate password to 72 bytes to avoid bcrypt errors
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    # JWT spec requires 'sub' to be a string
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user data"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_raw = payload.get("sub")
        role: str = payload.get("role")
        if user_id_raw is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        # Parse sub back to int (it was stringified during token creation)
        try:
            user_id = int(user_id_raw)
        except (ValueError, TypeError):
            user_id = user_id_raw
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


def require_faculty(current_user: dict = Depends(verify_token)) -> dict:
    """Dependency: requires a valid JWT with the FACULTY role."""
    if current_user.get("role") != "FACULTY":
        raise HTTPException(status_code=403, detail="Faculty access required")
    return current_user


def require_student(current_user: dict = Depends(verify_token)) -> dict:
    """Dependency: requires a valid JWT with the STUDENT role."""
    if current_user.get("role") != "STUDENT":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user


def create_reset_token() -> str:
    """Generate a secure random token for password reset"""
    return secrets.token_urlsafe(32)


def create_reset_token_expiry() -> datetime:
    """Create expiration time for reset token (1 hour from now)"""
    return datetime.utcnow() + timedelta(hours=1)

