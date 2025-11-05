# main.py
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
import secrets
import notification_queries
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import queries
from database_manager import verify_db_connection

# Load environment variables
load_dotenv()

# Basic logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Attendance Management API")

# Enable CORS
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# ---------- Models ----------
class Token(BaseModel):
    access_token: str
    token_type: str
    id: int
    name: str
    email: str
    role: str


class UserLogin(BaseModel):
    email: str
    password: str
    role: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    roll_number: Optional[int] = None


class ClassCreate(BaseModel):
    class_name: str


class AttendanceSession(BaseModel):
    class_id: int
    generated_code: str


class AttendanceRecord(BaseModel):
    session_id: int
    status: str  # PRESENT, ABSENT, or LATE


# ---------- Helpers ----------
def _truncate_to_72_bytes(s: str) -> str:
    """
    Ensure the string won't exceed 72 bytes when encoded as UTF-8.
    We cut the UTF-8 bytes to 72 and decode back ignoring partial chars.
    """
    if s is None:
        return ""
    b = s.encode("utf-8")[:72]
    return b.decode("utf-8", errors="ignore")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Safely verify password, truncating plain password to 72 bytes (bcrypt limit).
    If hashed_password is falsy, return False.
    """
    if not hashed_password:
        return False
    try:
        truncated = _truncate_to_72_bytes(plain_password)
        return pwd_context.verify(truncated, hashed_password)
    except Exception as e:
        logger.exception("Error verifying password: %s", e)
        return False


def get_password_hash(password: str) -> str:
    """
    Hash password after truncating to 72 bytes (bcrypt limit).
    """
    truncated = _truncate_to_72_bytes(password)
    return pwd_context.hash(truncated)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = queries.get_user_by_email(email)
    if user is None:
        raise credentials_exception
    return user


# ---------- Routes ----------
@app.get("/")
def root():
    return {"message": "Attendance API is up. See /docs for endpoints."}


# Auth endpoints
@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    try:
        # Check if user exists
        if queries.get_user_by_email(user.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
            )

        # Create user with hashed password (truncate to 72 bytes for bcrypt)
        hashed_password = get_password_hash(user.password)
        user_id = queries.create_user(
            name=user.name,
            email=user.email,
            password_hash=hashed_password,
            role=user.role,
            roll_number=user.roll_number,
        )

        return {"message": "User created successfully", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error during user registration: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@app.post("/auth/login")
async def login(user_login: UserLogin, request: Request):
    """
    Expects JSON body: { "email": "...", "password": "...", "role": "STUDENT" }
    """
    try:
        user = queries.get_user_by_email(user_login.email)
        # user might be None or missing 'password_hash'
        if not user or "password_hash" not in user or not user["password_hash"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        if not verify_password(user_login.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        # Check if role matches
        if user.get("role") != user_login.role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Incorrect role. User is not a {user_login.role}",
            )

        access_token = create_access_token(data={"sub": user["email"]})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
            },
        }
    except HTTPException:
        # re-raise HTTPExceptions unchanged
        raise
    except Exception as e:
        # Log unexpected errors and return generic 500
        logger.exception("Error in /auth/login: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/token")
async def login_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = queries.get_user_by_email(form_data.username)
    if not user or "password_hash" not in user or not verify_password(
        form_data.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
    }


@app.get("/users/me")
async def read_users_me(current_user=Depends(get_current_user)):
    return current_user


@app.get("/sessions/{date}")
def sessions_by_date(date: str):
    # date expected 'YYYY-MM-DD'
    result = queries.get_sessions_by_date(date)
    return result


@app.get("/session/{session_id}/attendance")
def attendance_for_session(session_id: int):
    return queries.get_attendance_for_session(session_id)


@app.get("/student/{student_id}/attendance-percentage")
def attendance_percentage_student(student_id: int):
    result = queries.get_attendance_percentage_for_student(student_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Student or records not found")
    return result


@app.get("/class/{class_id}/absent/{date}")
def absent_students(class_id: int, date: str):
    return queries.get_absent_students_in_class_on_date(class_id, date)


@app.get("/user/{user_id}/notifications/unread")
def unread_notifications(user_id: int, date: Optional[str] = None):
    if date:
        return queries.get_unread_notifications_for_user_on_date(user_id, date)
    else:
        sql_result = queries.get_unread_notifications_for_user_on_date(
            user_id, date=str(date) if date else "1970-01-01"
        )
        return sql_result


@app.get("/user/{user_id}/notifications/attendance")
def attendance_notifications(user_id: int):
    return queries.get_attendance_notifications_for_user(user_id)


@app.get("/user/{user_id}/notifications/sessions")
def session_notifications(user_id: int):
    return queries.get_session_notifications_for_user(user_id)


@app.get("/class/{class_id}/students/below_percentage")
def students_below_percentage(class_id: int, threshold: Optional[float] = 75.0):
    return queries.get_students_below_percentage(class_id, threshold)

@app.post("/faculty/classes/{class_id}/sessions")
async def start_class_session(class_id: int, current_user=Depends(get_current_user)):
    # Verify the user is a faculty member
    if current_user.get("role") != "FACULTY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty members can start sessions"
        )
    
    try:
        # Generate a random 6-character code for attendance
        generated_code = ''.join(secrets.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(6))
        
        # Start a new session with the generated code
        session = queries.create_session(class_id, generated_code)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
        
        return {
            "message": "Session started successfully",
            "session": session
        }
    except Exception as e:
        logger.exception("Error starting session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.patch("/faculty/classes/{class_id}/sessions/{session_id}/end")
async def end_class_session(
    class_id: int, 
    session_id: int, 
    current_user=Depends(get_current_user)
):
    # Verify the user is a faculty member
    if current_user.get("role") != "FACULTY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty members can end sessions"
        )
    
    try:
        # End the session
        updated = queries.end_session(session_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return {"message": "Session ended successfully"}
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end session"
        )


@app.get("/notifications")
async def get_notifications(
    current_user=Depends(get_current_user),
    unread_only: bool = False
):
    """Get user notifications"""
    try:
        notifications = notification_queries.get_user_notifications(
            current_user.get("id"),
            unread_only
        )
        return notifications
    except Exception as e:
        logger.exception("Error getting notifications")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/notifications/unread")
async def get_unread_notifications(current_user=Depends(get_current_user)):
    """Get unread notifications"""
    try:
        notifications = notification_queries.get_user_notifications(
            current_user.get("id"),
            unread_only=True
        )
        return notifications
    except Exception as e:
        logger.exception("Error getting unread notifications")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.patch("/notifications/{notification_id}/mark-read")
async def mark_notification_read(notification_id: int, current_user=Depends(get_current_user)):
    """Mark a notification as read"""
    try:
        updated = notification_queries.mark_notification_read(notification_id, current_user.get("id"))
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        return {"message": "Notification marked as read"}
    except Exception as e:
        logger.exception("Error marking notification as read")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/faculty/sessions/active")
async def get_active_sessions(current_user=Depends(get_current_user)):
    """Get all active sessions for the current user"""
    try:
        if current_user.get("role") == "FACULTY":
            # Get active sessions for faculty's classes
            sessions = queries.get_faculty_classes(current_user.get("id"))
            return [s for s in sessions if s.get("session_status") == "ACTIVE"]
        else:
            # Get active sessions for student's enrolled classes
            sessions = queries.get_student_classes(current_user.get("id"))
            return [s for s in sessions if s.get("session_status") == "ACTIVE"]
    except Exception as e:
        logger.exception("Error getting active sessions")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.exception("Error starting session: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/most-active-class")
def most_active_class():
    result = queries.get_most_active_class()
    if not result:
        raise HTTPException(status_code=404, detail="No classes or attendance records found")
    return result


@app.get("/faculty-with-classes")
def faculty_with_classes():
    return queries.get_faculty_with_classes()


# Faculty endpoints
@app.post("/api/faculty/classes")
async def create_class_endpoint(class_name: str, current_user=Depends(get_current_user)):
    try:
        if current_user["role"] != "FACULTY":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only faculty members can create classes"
            )

        import random, string

        join_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

        class_id = queries.create_class(faculty_id=current_user["id"], class_name=class_name, join_code=join_code)

        return {"class_id": class_id, "join_code": join_code}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creating class: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create class"
        )


@app.get("/api/faculty/classes")
async def get_faculty_classes_endpoint(current_user=Depends(get_current_user)):
    if current_user["role"] != "FACULTY":
        raise HTTPException(status_code=403, detail="Not authorized")

    return queries.get_faculty_classes(current_user["id"])


# Student endpoints
@app.get("/api/student/classes")
async def get_student_classes_endpoint(current_user=Depends(get_current_user)):
    try:
        if current_user["role"] != "STUDENT":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only students can access this endpoint"
            )

        return queries.get_student_classes(current_user["id"])
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error getting student classes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve student classes"
        )


@app.post("/api/student/classes/join")
async def join_class_endpoint(join_code: str, current_user=Depends(get_current_user)):
    try:
        if current_user["role"] != "STUDENT":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only students can join classes"
            )

        class_id = queries.join_class(student_id=current_user["id"], join_code=join_code)
        if not class_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid join code"
            )
            
        return {"message": "Successfully joined class", "class_id": class_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error joining class: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join class"
        )

    result = queries.join_class(current_user["id"], join_code)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid join code or already enrolled")

    return {"message": "Successfully joined class"}
