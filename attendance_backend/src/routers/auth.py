from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from src.core.database import engine
from src.core.security import verify_password, get_password_hash, create_access_token
from src.models.schemas import LoginRequest, RegisterRequest
from src.queries import create_notification

router = APIRouter(tags=["auth"])

@router.post("/login")
async def login(request: LoginRequest):
    """Login with email and password, returns JWT token"""
    try:
        # Truncate password to 72 bytes (bcrypt limit) to avoid errors
        password = request.password
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        
        async with engine.connect() as conn:
            q = text(
                "SELECT user_id, name, email, password_hash, role FROM users WHERE email = :email"
            )
            result = await conn.execute(q, {"email": request.email})
            row = result.fetchone()
            
            if not row:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            user = dict(row._mapping)
            
            # Verify password - support both plain text (old) and bcrypt (new)
            password_valid = False
            if user["password_hash"].startswith("$2b$"):
                # Bcrypt hash
                password_valid = verify_password(password, user["password_hash"])
            else:
                # Plain text (legacy - for backward compatibility)
                password_valid = (password == user["password_hash"])
            
            if not password_valid:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Create JWT token
            access_token = create_access_token(
                data={"sub": user["user_id"], "role": user["role"], "email": user["email"]}
            )
            
            return {
                "message": "Login successful",
                "access_token": access_token,
                "token_type": "bearer",
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[LOGIN] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register")
async def register(request: RegisterRequest):
    """Register a new user (student or faculty)"""
    try:
        print(f"[REGISTER] Attempting to register: {request.email}, role={request.role}")
        
        # Validate role
        if request.role not in ["STUDENT", "FACULTY"]:
            raise HTTPException(status_code=400, detail="Role must be STUDENT or FACULTY")
        
        # Validate password length
        if len(request.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        # Truncate password to 72 bytes (bcrypt limit)
        password = request.password
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        
        async with engine.begin() as conn:
            # Check if email already exists
            check_sql = text("SELECT user_id FROM users WHERE email = :email")
            existing = await conn.execute(check_sql, {"email": request.email})
            if existing.fetchone():
                print(f"[REGISTER] Email already exists: {request.email}")
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # Hash the password
            hashed_password = get_password_hash(password)
            
            # Insert new user
            insert_sql = text(
                """
                INSERT INTO users (name, email, password_hash, role)
                VALUES (:name, :email, :password, :role)
                RETURNING user_id, name, email, role
                """
            )
            result = await conn.execute(
                insert_sql,
                {
                    "name": request.name,
                    "email": request.email,
                    "password": hashed_password,
                    "role": request.role
                }
            )
            
            user = dict(result.fetchone()._mapping)
            print(f"[REGISTER] Successfully registered user_id={user['user_id']}")
            
            # Create welcome notification (needs separate transaction or fire-and-forget?)
            # Since we are in an async function, we can just await it. 
            # Note: create_notification manages its own connection/transaction.
            # Ideally we should use the same connection, but create_notification is a standalone helper.
            # Using standalone helper is safer to assume it works independently.
            await create_notification(
                user_id=user['user_id'],
                type="welcome",
                title="Welcome!",
                message=f"Welcome to the Attendance Management System, {user['name']}!",
                priority="low"
            )
            
            return {
                "message": "Registration successful",
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[REGISTER] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
