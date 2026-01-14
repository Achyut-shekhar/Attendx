# main.py
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Dict, Any
import queries
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text, bindparam
import os
from dotenv import load_dotenv
import random
import string
import math
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext

# Load environment variables first
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Attendance Management API")

# -------------------- CORS --------------------
# Get frontend URL from environment variable or use defaults
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        FRONTEND_URL,
        "*",  # Allow all origins (can be restricted in production)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- ENV & DB --------------------
# Already loaded above
DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL not found — set it in your .env file")
engine = create_engine(DB_URL, pool_pre_ping=True)

# -------------------- IN-MEMORY LOCATION STORAGE --------------------
# Store session locations temporarily (no database changes needed)
session_locations = {}  # {session_id: {latitude, longitude, radius_meters}}

# -------------------- HELPERS --------------------
def generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # Truncate password to 72 bytes to avoid bcrypt errors
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Truncate password to 72 bytes to avoid bcrypt errors
    print(f"[DEBUG] Hashing password, original length: {len(password)}, bytes: {len(password.encode('utf-8'))}")
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
        print(f"[DEBUG] Truncated password to length: {len(password)}, bytes: {len(password.encode('utf-8'))}")
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
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
        user_id: int = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates using Haversine formula.
    Returns distance in meters.
    """
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth radius in meters
    r = 6371000
    
    return c * r


@app.get("/")
def root():
    return {"message": "Attendance API is up. See /docs for endpoints."}


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "Attendance Management API",
        "database": "connected"
    }


# -------------------- EXISTING READS (from queries.py) --------------------
@app.get("/sessions/{date}")
def sessions_by_date(date: str):
    return queries.get_sessions_by_date(date)


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


# -------------------- NOTIFICATIONS --------------------
@app.get("/api/notifications/{user_id}")
def get_notifications(user_id: int, unread_only: bool = False):
    """Get all notifications for a user, optionally filtered to unread only"""
    try:
        with engine.connect() as conn:
            if unread_only:
                sql = text(
                    """
                    SELECT *
                    FROM notifications
                    WHERE user_id = :uid AND is_read = FALSE
                    ORDER BY created_at DESC
                    """
                )
            else:
                sql = text(
                    """
                    SELECT *
                    FROM notifications
                    WHERE user_id = :uid
                    ORDER BY created_at DESC
                    LIMIT 50
                    """
                )
            
            rows = conn.execute(sql, {"uid": user_id}).fetchall()
            result = []
            for row in rows:
                notification = dict(row._mapping)
                # Ensure backward compatibility - add missing fields if they don't exist
                if 'notification_id' not in notification:
                    notification['notification_id'] = notification.get('id')
                if 'title' not in notification:
                    notification['title'] = notification.get('type', '').replace('_', ' ').title()
                if 'message' not in notification:
                    notification['message'] = notification.get('content', '')
                if 'priority' not in notification:
                    notification['priority'] = 'medium'
                if 'related_class_id' not in notification:
                    notification['related_class_id'] = None
                if 'related_session_id' not in notification:
                    notification['related_session_id'] = None
                if 'class_name' not in notification:
                    notification['class_name'] = None
                if 'section' not in notification:
                    notification['section'] = None
                result.append(notification)
            return result
    except Exception as e:
        print(f"[NOTIFICATIONS] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/notifications/{user_id}/unread-count")
def get_unread_count(user_id: int):
    """Get count of unread notifications"""
    try:
        with engine.connect() as conn:
            sql = text(
                """
                SELECT COUNT(*) as count
                FROM notifications
                WHERE user_id = :uid AND is_read = FALSE
                """
            )
            row = conn.execute(sql, {"uid": user_id}).fetchone()
            return {"count": row.count if row else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int):
    """Mark a notification as read"""
    try:
        with engine.connect() as conn:
            sql = text(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE notification_id = :nid
                """
            )
            conn.execute(sql, {"nid": notification_id})
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/notifications/{user_id}/mark-all-read")
def mark_all_read(user_id: int):
    """Mark all notifications as read for a user"""
    try:
        with engine.connect() as conn:
            sql = text(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE user_id = :uid AND is_read = FALSE
                """
            )
            conn.execute(sql, {"uid": user_id})
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/notifications/{notification_id}")
def delete_notification(notification_id: int):
    """Delete a notification"""
    try:
        with engine.connect() as conn:
            sql = text(
                """
                DELETE FROM notifications
                WHERE notification_id = :nid
                """
            )
            conn.execute(sql, {"nid": notification_id})
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/class/{class_id}/students/below_percentage")
def students_below_percentage(class_id: int, threshold: Optional[float] = 75.0):
    return queries.get_students_below_percentage(class_id, threshold)


@app.get("/most-active-class")
def most_active_class():
    result = queries.get_most_active_class()
    if not result:
        raise HTTPException(status_code=404, detail="No classes or attendance records found")
    return result


@app.get("/faculty-with-classes")
def faculty_with_classes():
    return queries.get_faculty_with_classes()


# -------------------- MODELS --------------------
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # "STUDENT" or "FACULTY"


class CreateClassRequest(BaseModel):
    class_name: str
    section: str = "A"
    join_code: str
    faculty_id: int


class JoinClassRequest(BaseModel):
    join_code: str
    student_id: int
    roll_number: str  # Student's roll number for the class
    section: Optional[str] = None  # Optional section label (A/B/etc)


class MarkAttendanceRequest(BaseModel):
    session_id: int
    student_id: int
    status: Optional[str] = "PRESENT"  # PRESENT | LATE | ABSENT


class SubmitAttendanceCode(BaseModel):
    student_id: int
    code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class StartSessionRequest(BaseModel):
    class_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[int] = 50


# -------------------- LOGIN --------------------
@app.post("/login")
def login(request: LoginRequest):
    """Login with email and password, returns JWT token"""
    try:
        # Truncate password to 72 bytes (bcrypt limit) to avoid errors
        password = request.password
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        
        with engine.connect() as conn:
            q = text(
                "SELECT user_id, name, email, password_hash, role FROM users WHERE email = :email"
            )
            row = conn.execute(q, {"email": request.email}).fetchone()
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/register")
def register(request: RegisterRequest):
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
        
        with engine.connect() as conn:
            # Check if email already exists
            check_sql = text("SELECT user_id FROM users WHERE email = :email")
            existing = conn.execute(check_sql, {"email": request.email}).fetchone()
            
            if existing:
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
            result = conn.execute(
                insert_sql,
                {
                    "name": request.name,
                    "email": request.email,
                    "password": hashed_password,
                    "role": request.role
                }
            )
            conn.commit()
            
            user = dict(result.fetchone()._mapping)
            print(f"[REGISTER] Successfully registered user_id={user['user_id']}")
            
            # Create welcome notification
            create_notification(
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- FACULTY --------------------
@app.get("/api/faculty/sessions/active")
def get_active_sessions(faculty_id: int):
    try:
        sql = text(
            """
            SELECT s.session_id, s.class_id, c.class_name, s.start_time, s.status
            FROM attendance_sessions s
            JOIN classes c ON s.class_id = c.class_id
            WHERE c.faculty_id = :faculty_id AND s.status = 'ACTIVE'
            ORDER BY s.start_time DESC
            """
        )
        with engine.connect() as conn:
            rows = conn.execute(sql, {"faculty_id": faculty_id})
            return [dict(r._mapping) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/faculty/{faculty_id}/classes")
def get_faculty_classes(faculty_id: int):
    try:
        sql = text(
            """
            SELECT class_id, class_name, join_code
            FROM classes
            WHERE faculty_id = :faculty_id
            ORDER BY class_name
            """
        )
        with engine.connect() as conn:
            rows = conn.execute(sql, {"faculty_id": faculty_id})
            return [dict(r._mapping) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/faculty/classes")
def create_faculty_class(class_data: CreateClassRequest):
    try:
        join_code = class_data.join_code or generate_code()
        sql = text(
            """
            INSERT INTO classes (class_name, faculty_id, join_code)
            VALUES (:class_name, :faculty_id, :join_code)
            RETURNING class_id, class_name, join_code
            """
        )
        with engine.connect() as conn:
            res = conn.execute(
                sql,
                {
                    "class_name": class_data.class_name,
                    "faculty_id": class_data.faculty_id,
                    "join_code": join_code,
                },
            )
            conn.commit()
            return dict(res.fetchone()._mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/faculty/classes/{class_id}")
def delete_faculty_class(class_id: int):
    try:
        sql = text("DELETE FROM classes WHERE class_id = :class_id RETURNING class_id")
        with engine.connect() as conn:
            res = conn.execute(sql, {"class_id": class_id})
            conn.commit()
            if res.rowcount == 0:
                raise HTTPException(status_code=404, detail="Class not found")
            return {"message": "Class deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/faculty/classes/{class_id}/sessions")
def start_session(class_id: int, request: StartSessionRequest = None):
    """Start a new attendance session with generated code and optional location"""
    try:
        # Handle both old API calls (no body) and new API calls (with location data)
        if request is None:
            request = StartSessionRequest(class_id=class_id)
        
        print(f"[START_SESSION] Request to start session for class_id={class_id}")
        if request.latitude and request.longitude:
            print(f"[START_SESSION] Location provided: lat={request.latitude}, lon={request.longitude}, radius={request.radius_meters}m")
        
        with engine.connect() as conn:
            # Check if there's already an active session for this class
            check_sql = text(
                """
                SELECT session_id, generated_code 
                FROM attendance_sessions 
                WHERE class_id = :class_id AND STATUS = 'ACTIVE'
                LIMIT 1
                """
            )
            existing = conn.execute(check_sql, {"class_id": class_id}).fetchone()
            
            if existing:
                print(f"[START_SESSION] Active session already exists: session_id={existing.session_id}")
                result = dict(existing._mapping)
                # Add location from memory if available
                if existing.session_id in session_locations:
                    result.update(session_locations[existing.session_id])
                return result
            
            # Create new session
            code = generate_code()
            print(f"[START_SESSION] Creating new session with code={code}")
            
            # Get current time in IST (UTC+5:30) as timezone-naive datetime
            utc_now = datetime.utcnow()
            ist_offset = timedelta(hours=5, minutes=30)
            current_time_ist = utc_now + ist_offset
            
            sql = text(
                """
                INSERT INTO attendance_sessions (class_id, start_time, status, generated_code)
                VALUES (:class_id, :start_time, 'ACTIVE', :code)
                RETURNING session_id, class_id, start_time, status, generated_code
                """
            )
            res = conn.execute(sql, {"class_id": class_id, "start_time": current_time_ist, "code": code})
            conn.commit()
            
            result = dict(res.fetchone()._mapping)
            session_id = result['session_id']
            print(f"[START_SESSION] Created session_id={session_id}")
            
            # Store location in memory if provided
            if request.latitude and request.longitude:
                session_locations[session_id] = {
                    'latitude': request.latitude,
                    'longitude': request.longitude,
                    'radius_meters': request.radius_meters
                }
                result['latitude'] = request.latitude
                result['longitude'] = request.longitude
                result['radius_meters'] = request.radius_meters
                print(f"[START_SESSION] Location stored in memory for session {session_id}")
            
            # Get class name and enrolled students
            class_sql = text("SELECT class_name FROM classes WHERE class_id = :cid")
            class_row = conn.execute(class_sql, {"cid": class_id}).fetchone()
            class_name = class_row[0] if class_row else "Unknown Class"
            
            students_sql = text(
                """
                SELECT student_id FROM class_enrollments WHERE class_id = :cid
                """
            )
            students = conn.execute(students_sql, {"cid": class_id}).fetchall()
            
            # Create notifications for all enrolled students
            for student in students:
                create_notification(
                    user_id=student[0],
                    type="session_start",
                    title="New Attendance Session",
                    message=f"{class_name} attendance session is now active. Code: {code}",
                    priority="high",
                    related_class_id=class_id,
                    related_session_id=result['session_id']
                )
            
            print(f"[START_SESSION] Created {len(students)} notifications")
            
            return result
    except Exception as e:
        print(f"[START_SESSION] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/faculty/classes/{class_id}/sessions/{session_id}/end")
def end_session(class_id: int, session_id: int):
    try:
        print(f"[END_SESSION] Ending session_id={session_id}, class_id={class_id}")
        
        with engine.connect() as conn:
            # First, mark all enrolled students who don't have a record as ABSENT
            mark_absent_sql = text(
                """
                INSERT INTO attendance_records (session_id, student_id, status, marked_at)
                SELECT :session_id, ce.student_id, 'ABSENT', NOW()
                FROM class_enrollments ce
                WHERE ce.class_id = :class_id
                AND NOT EXISTS (
                    SELECT 1 FROM attendance_records ar
                    WHERE ar.session_id = :session_id
                    AND ar.student_id = ce.student_id
                )
                """
            )
            result = conn.execute(
                mark_absent_sql, 
                {"session_id": session_id, "class_id": class_id}
            )
            absent_count = result.rowcount
            print(f"[END_SESSION] Marked {absent_count} students as ABSENT")
            
            # Then update the session status
            # Get current time in IST (UTC+5:30) as timezone-naive datetime
            utc_now = datetime.utcnow()
            ist_offset = timedelta(hours=5, minutes=30)
            current_time_ist = utc_now + ist_offset
            
            sql = text(
                """
                UPDATE attendance_sessions
                SET end_time = :end_time, status = 'CLOSED'
                WHERE session_id = :session_id AND class_id = :class_id
                RETURNING *
                """
            )
            row = conn.execute(
                sql, {"session_id": session_id, "class_id": class_id, "end_time": current_time_ist}
            ).fetchone()
            conn.commit()
            
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Get attendance statistics and class name
            stats_sql = text(
                """
                SELECT 
                    COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_count,
                    COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late_count,
                    COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_count,
                    COUNT(*) as total_count
                FROM attendance_records
                WHERE session_id = :sid
                """
            )
            stats = conn.execute(stats_sql, {"sid": session_id}).fetchone()
            
            class_sql = text("SELECT class_name FROM classes WHERE class_id = :cid")
            class_row = conn.execute(class_sql, {"cid": class_id}).fetchone()
            class_name = class_row[0] if class_row else "Unknown Class"
            
            # Get all students and send notifications
            students_sql = text(
                """
                SELECT ar.student_id, ar.status
                FROM attendance_records ar
                WHERE ar.session_id = :sid
                """
            )
            students = conn.execute(students_sql, {"sid": session_id}).fetchall()
            
            for student in students:
                student_id, status = student[0], student[1]
                if status == 'PRESENT' or status == 'LATE':
                    create_notification(
                        user_id=student_id,
                        type="attendance_marked",
                        title="Attendance Recorded",
                        message=f"Your attendance has been marked as {status} for {class_name}",
                        priority="low",
                        related_class_id=class_id,
                        related_session_id=session_id
                    )
                else:  # ABSENT
                    create_notification(
                        user_id=student_id,
                        type="attendance_absent",
                        title="Marked Absent",
                        message=f"You were marked absent for {class_name}",
                        priority="medium",
                        related_class_id=class_id,
                        related_session_id=session_id
                    )
            
            # Send summary notification to faculty (get faculty_id from class)
            faculty_sql = text("SELECT faculty_id FROM classes WHERE class_id = :cid")
            faculty_row = conn.execute(faculty_sql, {"cid": class_id}).fetchone()
            if faculty_row:
                create_notification(
                    user_id=faculty_row[0],
                    type="session_ended",
                    title="Session Ended",
                    message=f"{class_name} attendance session ended. {stats[0]}/{stats[3]} students present.",
                    priority="medium",
                    related_class_id=class_id,
                    related_session_id=session_id
                )
            
            # Clean up location data from memory
            if session_id in session_locations:
                del session_locations[session_id]
                print(f"[END_SESSION] Cleaned up location data for session {session_id}")
            
            print(f"[END_SESSION] Session closed successfully, notifications sent")
            return dict(row._mapping)
    except Exception as e:
        print(f"[END_SESSION] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Raw combined view (kept for compatibility with existing UI)
@app.get("/api/faculty/classes/{class_id}/attendance")
def get_session_attendance(class_id: int):
    try:
        sql = text(
            """
            SELECT
                s.session_id, s.start_time, s.end_time, s.status,
                u.user_id as student_id,
                u.name AS student_name,
                ar.status AS attendance_status,
                ar.marked_at
            FROM attendance_sessions s
            LEFT JOIN attendance_records ar ON s.session_id = ar.session_id
            LEFT JOIN users u ON ar.student_id = u.user_id
            WHERE s.class_id = :class_id
            ORDER BY s.start_time DESC, u.name
            """
        )
        with engine.connect() as conn:
            return [dict(r._mapping) for r in conn.execute(sql, {"class_id": class_id})]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Date-scoped attendance (returns rows for ALL sessions that day)
@app.get("/api/faculty/classes/{class_id}/attendance/by-date")
def get_class_attendance_by_date(class_id: int, date: str):
    """
    Returns all rows for the given YYYY-MM-DD across all sessions on that day.
    Each row: session_id, student_id, student_name, status (PRESENT/LATE/ABSENT), marked_at (nullable).
    Also returns totals across the day.
    """
    try:
        with engine.connect() as conn:
            # Sessions on the date
            sessions_sql = text(
                """
                SELECT session_id, class_id, start_time, end_time, status
                FROM attendance_sessions
                WHERE class_id = :cid AND DATE(start_time) = CAST(:d AS DATE)
                ORDER BY start_time ASC
                """
            )
            sessions = [
                dict(r._mapping)
                for r in conn.execute(sessions_sql, {"cid": class_id, "d": date})
            ]

            if not sessions:
                return {
                    "date": date,
                    "records": [],
                    "totals": {"present": 0, "late": 0, "absent": 0},
                }

            session_ids = [s["session_id"] for s in sessions]

            # Enrolled students
            enroll_sql = text(
                """
                SELECT u.user_id, u.name, u.email, ce.roll_number, ce.section
                FROM class_enrollments ce
                JOIN users u ON u.user_id = ce.student_id
                WHERE ce.class_id = :cid
                ORDER BY u.name
                """
            )
            enrolled = [
                dict(r._mapping) for r in conn.execute(enroll_sql, {"cid": class_id})
            ]
            enrolled_ids = {e["user_id"] for e in enrolled}

            # Latest attendance per (session_id, student_id)
            records_sql = text(
                """
                SELECT DISTINCT ON (ar.session_id, ar.student_id)
                       ar.session_id,
                       ar.student_id,
                       u.name AS student_name,
                       ce.roll_number,
                       ce.section,
                       ar.status,
                       ar.marked_at
                FROM attendance_records ar
                JOIN users u ON u.user_id = ar.student_id
                JOIN class_enrollments ce ON ce.student_id = ar.student_id AND ce.class_id = :cid
                WHERE ar.session_id IN :sids
                ORDER BY ar.session_id, ar.student_id, ar.marked_at DESC
                """
            ).bindparams(bindparam("sids", expanding=True))

            present_rows = [
                dict(r._mapping)
                for r in conn.execute(records_sql, {"sids": tuple(session_ids), "cid": class_id})
            ]

            # Build ABSENT rows
            by_session_present_ids: Dict[int, set] = {}
            for r in present_rows:
                by_session_present_ids.setdefault(r["session_id"], set()).add(
                    r["student_id"]
                )

            absent_rows: List[Dict[str, Any]] = []
            for s in sessions:
                sid = s["session_id"]
                marked_ids = by_session_present_ids.get(sid, set())
                missing = enrolled_ids - marked_ids
                for mid in missing:
                    stu = next((e for e in enrolled if e["user_id"] == mid), None)
                    absent_rows.append(
                        {
                            "session_id": sid,
                            "student_id": mid,
                            "student_name": stu["name"] if stu else "Unknown",
                            "roll_number": stu.get("roll_number") if stu else None,
                            "section": stu.get("section") if stu else None,
                            "status": "ABSENT",
                            "marked_at": None,
                        }
                    )

            all_rows = present_rows + absent_rows
            totals = {
                "present": sum(1 for r in all_rows if r["status"] == "PRESENT"),
                "late": sum(1 for r in all_rows if r["status"] == "LATE"),
                "absent": sum(1 for r in all_rows if r["status"] == "ABSENT"),
            }

            return {"date": date, "records": all_rows, "totals": totals}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Active session + code
@app.get("/class/{class_id}/active-session")
def get_active_session(class_id: int):
    try:
        sql = text(
            """
            SELECT session_id, class_id, start_time, status, generated_code
            FROM attendance_sessions
            WHERE class_id = :class_id AND status = 'ACTIVE'
            ORDER BY start_time DESC
            LIMIT 1
            """
        )
        with engine.connect() as conn:
            row = conn.execute(sql, {"class_id": class_id}).fetchone()
            return dict(row._mapping) if row else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Session by id
@app.get("/api/faculty/sessions/{session_id}")
def get_session_by_id(session_id: int):
    try:
        sql = text(
            """
            SELECT session_id, class_id, start_time, end_time, status, generated_code
            FROM attendance_sessions
            WHERE session_id = :session_id
            LIMIT 1
            """
        )
        with engine.connect() as conn:
            row = conn.execute(sql, {"session_id": session_id}).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            return dict(row._mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Students in a class
@app.get("/api/faculty/classes/{class_id}/students")
def get_class_students(class_id: int):
    try:
        sql = text(
            """
            SELECT u.user_id, u.name, u.email, ce.roll_number, ce.section
            FROM class_enrollments ce
            JOIN users u ON ce.student_id = u.user_id
            WHERE ce.class_id = :class_id
            ORDER BY ce.roll_number, u.name
            """
        )
        with engine.connect() as conn:
            rows = conn.execute(sql, {"class_id": class_id}).fetchall()
            return [dict(r._mapping) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Class details (header for dialog)
@app.get("/api/faculty/classes/{class_id}/details")
def faculty_class_details(class_id: int):
    try:
        sql = text(
            """
            SELECT c.class_id, c.class_name, c.join_code, u.name AS faculty_name
            FROM classes c
            JOIN users u ON c.faculty_id = u.user_id
            WHERE c.class_id = :cid
            """
        )
        with engine.connect() as conn:
            row = conn.execute(sql, {"cid": class_id}).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Class not found")
            return dict(row._mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- STUDENT --------------------
@app.get("/api/student/classes")
def get_enrolled_classes(student_id: int):
    try:
        sql = text(
            """
                 SELECT c.class_id,
                     c.class_name,
                     c.join_code,
                     u.name as faculty_name,
                     ce.roll_number,
                     ce.section
            FROM class_enrollments ce
            JOIN classes c ON ce.class_id = c.class_id
            JOIN users u ON c.faculty_id = u.user_id
            WHERE ce.student_id = :student_id
            ORDER BY c.class_name
            """
        )
        with engine.connect() as conn:
            return [
                dict(r._mapping)
                for r in conn.execute(sql, {"student_id": student_id})
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/student/classes/join")
def join_class(join_data: JoinClassRequest):
    try:
        print(f"[JOIN] Received: student_id={join_data.student_id}, join_code={join_data.join_code}")
        section_value = (join_data.section or "").strip() or None
        if section_value:
            section_value = section_value[:50]
        
        find_sql = text("SELECT class_id FROM classes WHERE join_code = :join_code")
        check_enroll = text(
            "SELECT 1 FROM class_enrollments WHERE student_id = :student_id AND class_id = :class_id"
        )
        enroll_sql = text(
            """
            INSERT INTO class_enrollments (student_id, class_id, roll_number, section)
            VALUES (:student_id, :class_id, :roll_number, :section)
            """
        )
        with engine.connect() as conn:
            print(f"[JOIN] Looking for class with join_code={join_data.join_code}")
            class_row = conn.execute(
                find_sql, {"join_code": join_data.join_code}
            ).fetchone()
            if not class_row:
                print(f"[JOIN] No class found with code={join_data.join_code}")
                raise HTTPException(status_code=404, detail="Invalid join code")
            class_id = class_row[0]
            print(f"[JOIN] Found class_id={class_id}")
            
            # Check if already enrolled
            print(f"[JOIN] Checking if student {join_data.student_id} already enrolled in class {class_id}")
            already_enrolled = conn.execute(
                check_enroll,
                {"student_id": join_data.student_id, "class_id": class_id},
            ).fetchone()
            if already_enrolled:
                print(f"[JOIN] Student already enrolled")
                conn.commit()
                return {"message": "Already enrolled", "class_id": class_id}
            
            # Enroll the student
            print(f"[JOIN] Enrolling student {join_data.student_id} in class {class_id} with roll_number={join_data.roll_number}, section={section_value}")
            conn.execute(
                enroll_sql,
                {
                    "student_id": join_data.student_id,
                    "class_id": class_id,
                    "roll_number": join_data.roll_number,
                    "section": section_value,
                },
            )
            conn.commit()
            
            # Get student and class details for notification
            student_sql = text("SELECT name FROM users WHERE user_id = :uid")
            student_row = conn.execute(student_sql, {"uid": join_data.student_id}).fetchone()
            student_name = student_row[0] if student_row else "Unknown Student"
            
            class_detail_sql = text("SELECT class_name, faculty_id FROM classes WHERE class_id = :cid")
            class_detail = conn.execute(class_detail_sql, {"cid": class_id}).fetchone()
            class_name = class_detail[0] if class_detail else "Unknown Class"
            faculty_id = class_detail[1] if class_detail else None
            
            # Notify the student
            create_notification(
                user_id=join_data.student_id,
                type="class_joined",
                title="Joined Class",
                message=f"You have successfully joined {class_name}",
                priority="low",
                related_class_id=class_id
            )
            
            # Notify the faculty
            if faculty_id:
                create_notification(
                    user_id=faculty_id,
                    type="student_joined",
                    title="New Student",
                    message=f"{student_name} has joined your {class_name} class",
                    priority="low",
                    related_class_id=class_id
                )
            
            print(f"[JOIN] Successfully enrolled!")
            return {"message": "Successfully joined class", "class_id": class_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[JOIN] ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {type(e).__name__}: {str(e)}")


# Student submits code with optional location validation
@app.post("/attendance/submit-code")
def submit_code(payload: SubmitAttendanceCode):
    try:
        sql_session = text(
            """
            SELECT session_id, class_id
            FROM attendance_sessions
            WHERE generated_code = :code AND status = 'ACTIVE'
            LIMIT 1
            """
        )
        with engine.connect() as conn:
            session = conn.execute(sql_session, {"code": payload.code}).fetchone()
            if not session:
                raise HTTPException(status_code=400, detail="Invalid or expired code")
            session_id = session.session_id
            class_id = session.class_id
            
            # Get location from memory if available
            location_data = session_locations.get(session_id, {})
            session_lat = location_data.get('latitude')
            session_lon = location_data.get('longitude')
            radius_meters = location_data.get('radius_meters', 50)

            sql_enroll = text(
                "SELECT 1 FROM class_enrollments WHERE student_id = :sid AND class_id = :cid"
            )
            if not conn.execute(
                sql_enroll, {"sid": payload.student_id, "cid": class_id}
            ).fetchone():
                raise HTTPException(status_code=403, detail="Student not enrolled in this class")

            # Determine status based on location if session has location
            status = "PRESENT"
            distance = None
            location_message = ""
            
            if session_lat and session_lon:
                # Session has location requirement
                if payload.latitude and payload.longitude:
                    # Student provided location - calculate distance
                    distance = calculate_distance(
                        session_lat, session_lon,
                        payload.latitude, payload.longitude
                    )
                    
                    print(f"[LOCATION_CHECK] Session: ({session_lat}, {session_lon})")
                    print(f"[LOCATION_CHECK] Student: ({payload.latitude}, {payload.longitude})")
                    print(f"[LOCATION_CHECK] Distance: {distance:.2f}m, Radius: {radius_meters}m")
                    
                    if distance > radius_meters:
                        status = "ABSENT"
                        location_message = f" - Outside zone (Distance: {distance:.0f}m, Allowed: {radius_meters}m)"
                        print(f"[LOCATION_CHECK] Student is OUTSIDE the allowed radius")
                    else:
                        location_message = f" - Within zone ({distance:.0f}m)"
                        print(f"[LOCATION_CHECK] Student is WITHIN the allowed radius")
                else:
                    # Session requires location but student didn't provide it
                    raise HTTPException(
                        status_code=400,
                        detail="Location is required for this session. Please enable location services."
                    )

            # Upsert attendance record
            update_sql = text(
                """
                UPDATE attendance_records
                SET status = :status, marked_at = NOW()
                WHERE session_id = :ses AND student_id = :sid
                """
            )
            res = conn.execute(
                update_sql, {"status": status, "ses": session_id, "sid": payload.student_id}
            )
            if res.rowcount == 0:
                insert_sql = text(
                    """
                    INSERT INTO attendance_records (session_id, student_id, status, marked_at)
                    VALUES (:ses, :sid, :status, NOW())
                    """
                )
                conn.execute(insert_sql, {"ses": session_id, "sid": payload.student_id, "status": status})

            conn.commit()
            
            # Get class name and create notification
            class_sql = text("SELECT class_name FROM classes WHERE class_id = :cid")
            class_info = conn.execute(class_sql, {"cid": class_id}).fetchone()
            if class_info:
                class_name = class_info[0]
                if status == "ABSENT":
                    create_notification(
                        user_id=payload.student_id,
                        type="attendance_marked",
                        title="Attendance: Outside Zone",
                        message=f"You were outside the classroom radius for {class_name}{location_message}",
                        priority="high"
                    )
                else:
                    create_notification(
                        user_id=payload.student_id,
                        type="attendance_marked",
                        title="Attendance Confirmed",
                        message=f"Your attendance has been recorded as {status} for {class_name}{location_message}",
                        priority="low"
                    )
            
            return {
                "message": f"Attendance marked as {status}{location_message}",
                "session_id": session_id,
                "status": status,
                "distance": round(distance, 2) if distance else None,
                "within_radius": status == "PRESENT"
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SUBMIT_CODE_ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Manual mark — supports PRESENT/LATE/ABSENT
@app.post("/session/{session_id}/attendance")
def mark_attendance_manual(session_id: int, payload: MarkAttendanceRequest):
    try:
        status = (payload.status or "PRESENT").upper()
        print(f"[MANUAL_ATTENDANCE] session_id={session_id}, student_id={payload.student_id}, status={status}")
        
        if status not in ("PRESENT", "LATE", "ABSENT"):
            raise HTTPException(status_code=400, detail="Invalid status")

        with engine.connect() as conn:
            s = conn.execute(
                text("SELECT 1 FROM attendance_sessions WHERE session_id = :sid"),
                {"sid": session_id},
            ).fetchone()
            if not s:
                raise HTTPException(status_code=404, detail="Session not found")

            upd = conn.execute(
                text(
                    """
                    UPDATE attendance_records
                    SET status = :st, marked_at = NOW()
                    WHERE session_id = :sid AND student_id = :uid
                    """
                ),
                {"st": status, "sid": session_id, "uid": payload.student_id},
            )
            if upd.rowcount == 0:
                print(f"[MANUAL_ATTENDANCE] No existing record, inserting new one")
                conn.execute(
                    text(
                        """
                        INSERT INTO attendance_records (session_id, student_id, status, marked_at)
                        VALUES (:sid, :uid, :st, NOW())
                        """
                    ),
                    {"sid": session_id, "uid": payload.student_id, "st": status},
                )
            else:
                print(f"[MANUAL_ATTENDANCE] Updated existing record")
            conn.commit()
            
            # Get class info for notification
            class_sql = text(
                """
                SELECT c.class_name, c.class_id
                FROM classes c
                JOIN attendance_sessions s ON c.class_id = s.class_id
                WHERE s.session_id = :sid
                """
            )
            class_info = conn.execute(class_sql, {"sid": session_id}).fetchone()
            
            if class_info:
                class_name = class_info[0]
                # Send notification to student
                create_notification(
                    user_id=payload.student_id,
                    type="attendance_marked",
                    title="Attendance Updated",
                    message=f"Your attendance has been manually marked as {status} for {class_name}",
                    priority="medium"
                )
            
            print(f"[MANUAL_ATTENDANCE] Successfully saved status={status}")
            return {
                "message": "Attendance updated",
                "session_id": session_id,
                "student_id": payload.student_id,
                "status": status,
            }
    except Exception as e:
        print(f"[MANUAL_ATTENDANCE] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Student: class details & history
@app.get("/api/student/classes/{class_id}")
def get_student_class_details(class_id: int, student_id: int):
    try:
        sql = text(
            """
            SELECT
                c.class_id, c.class_name, c.faculty_id, u.name as faculty_name, NULL::text as attendance_mode,
                COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::FLOAT / NULLIF(COUNT(ar.record_id), 0) * 100 as attendance_rate
            FROM classes c
            JOIN users u ON c.faculty_id = u.user_id
            LEFT JOIN class_enrollments ce ON c.class_id = ce.class_id AND ce.student_id = :student_id
            LEFT JOIN attendance_sessions s ON s.class_id = c.class_id
            LEFT JOIN attendance_records ar ON ar.session_id = s.session_id AND ar.student_id = :student_id
            WHERE c.class_id = :class_id
            GROUP BY c.class_id, c.class_name, c.faculty_id, u.name
            """
        )
        with engine.connect() as conn:
            row = conn.execute(
                sql, {"class_id": class_id, "student_id": student_id}
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Class not found")
            data = dict(row._mapping)
            data["attendance_rate"] = data["attendance_rate"] or 0
            return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/student/classes/{class_id}/attendance")
def get_student_attendance_records(class_id: int, student_id: int):
    try:
        print(f"[STUDENT_ATTENDANCE] Fetching records for class_id={class_id}, student_id={student_id}")
        sql = text(
            """
            SELECT ar.record_id, ar.session_id, ar.student_id, ar.status, ar.marked_at as recorded_at, c.class_name
            FROM attendance_records ar
            JOIN attendance_sessions s ON ar.session_id = s.session_id
            JOIN classes c ON s.class_id = c.class_id
            WHERE s.class_id = :class_id AND ar.student_id = :student_id
            ORDER BY ar.marked_at DESC
            """
        )
        with engine.connect() as conn:
            results = [
                dict(r._mapping)
                for r in conn.execute(
                    sql, {"class_id": class_id, "student_id": student_id}
                )
            ]
            print(f"[STUDENT_ATTENDANCE] Found {len(results)} records")
            for r in results:
                print(f"  - record_id={r['record_id']}, status={r['status']}, date={r['recorded_at']}")
            return results
    except Exception as e:
        print(f"[STUDENT_ATTENDANCE] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# --- NEW: list sessions on a date ---
@app.get("/api/faculty/classes/{class_id}/sessions/by-date")
def list_sessions_by_date(
    class_id: int, date: str = Query(..., description="YYYY-MM-DD")
):
    try:
        with engine.connect() as conn:
            sql = text(
                """
                SELECT session_id, class_id, start_time, end_time, status
                FROM attendance_sessions
                WHERE class_id = :cid AND DATE(start_time) = CAST(:d AS DATE)
                ORDER BY start_time ASC
                """
            )
            rows = conn.execute(sql, {"cid": class_id, "d": date}).fetchall()
            result = [dict(r._mapping) for r in rows]
            return result
    except Exception as e:
        print(f"[SESSIONS_BY_DATE] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- NEW: session-level flat attendance (includes explicit ABSENT rows; no duplicates) ---
@app.get("/api/faculty/sessions/{session_id}/attendance/flat")
def get_session_attendance_flat(session_id: int):
    try:
        with engine.connect() as conn:
            # session info
            srow = conn.execute(
                text(
                    "SELECT session_id, class_id, start_time, end_time, status FROM attendance_sessions WHERE session_id = :sid"
                ),
                {"sid": session_id},
            ).fetchone()
            if not srow:
                raise HTTPException(status_code=404, detail="Session not found")
            sess = dict(srow._mapping)
            cid = sess["class_id"]

            # enrolled students
            enroll = conn.execute(
                text(
                    """
                    SELECT u.user_id, u.name, ce.roll_number, ce.section
                    FROM class_enrollments ce
                    JOIN users u ON u.user_id = ce.student_id
                    WHERE ce.class_id = :cid
                    ORDER BY ce.roll_number NULLS LAST, u.name
                    """
                ),
                {"cid": cid},
            ).fetchall()
            enrolled = [dict(r._mapping) for r in enroll]
            enrolled_ids = {e["user_id"] for e in enrolled}

            # latest marked record per student for this session
            marked = conn.execute(
                text(
                    """
                          SELECT DISTINCT ON (ar.student_id)
                              ar.student_id,
                              u.name AS student_name,
                              ce.roll_number,
                              ce.section,
                              ar.status,
                              ar.marked_at
                    FROM attendance_records ar
                    JOIN users u ON u.user_id = ar.student_id
                    JOIN class_enrollments ce ON ce.student_id = ar.student_id AND ce.class_id = :cid
                    WHERE ar.session_id = :sid
                    ORDER BY ar.student_id, ar.marked_at DESC
                    """
                ),
                {"sid": session_id, "cid": cid},
            ).fetchall()
            present_rows = [dict(r._mapping) for r in marked]
            present_ids = {r["student_id"] for r in present_rows}

            # explicit ABSENT rows
            absent_rows: List[Dict[str, Any]] = []
            for mid in sorted(enrolled_ids - present_ids):
                stu = next((e for e in enrolled if e["user_id"] == mid), None)
                absent_rows.append(
                    {
                        "student_id": mid,
                        "student_name": (stu["name"] if stu else "Unknown"),
                        "roll_number": (stu["roll_number"] if stu else None),
                        "section": (stu["section"] if stu else None),
                        "status": "ABSENT",
                        "marked_at": None,
                    }
                )

            all_rows = present_rows + absent_rows
            totals = {
                "present": sum(1 for r in all_rows if r["status"] == "PRESENT"),
                "late": sum(1 for r in all_rows if r["status"] == "LATE"),
                "absent": sum(1 for r in all_rows if r["status"] == "ABSENT"),
            }
            return {"session": sess, "records": all_rows, "totals": totals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- NEW: sessions stats per class (authoritative count and last session time) ---
@app.get("/api/faculty/classes/{class_id}/sessions/stats")
def get_class_sessions_stats(class_id: int):
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT COUNT(*) AS sessions_count,
                           MAX(start_time) AS last_start
                    FROM attendance_sessions
                    WHERE class_id = :cid
                    """
                ),
                {"cid": class_id},
            ).fetchone()

            sessions_count = int(row._mapping["sessions_count"]) if row else 0
            last_session = (
                row._mapping["last_start"].isoformat() if row and row._mapping["last_start"] else None
            )
            return {"sessions_count": sessions_count, "last_session": last_session}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- NEW: Get all sessions with attendance data for export ---
@app.get("/api/faculty/classes/{class_id}/sessions/all-with-attendance")
def get_all_sessions_with_attendance(class_id: int):
    """
    Efficiently fetch all sessions for a class with attendance data in one query.
    Optimized for export functionality.
    """
    try:
        with engine.connect() as conn:
            # Verify class exists
            class_row = conn.execute(
                text("SELECT class_id FROM classes WHERE class_id = :cid"),
                {"cid": class_id}
            ).fetchone()
            if not class_row:
                raise HTTPException(status_code=404, detail="Class not found")

            # Get all enrolled students for this class
            enrolled_students = conn.execute(
                text(
                    """
                    SELECT u.user_id, u.name, ce.roll_number, ce.section
                    FROM class_enrollments ce
                    JOIN users u ON u.user_id = ce.student_id
                    WHERE ce.class_id = :cid
                    ORDER BY ce.roll_number NULLS LAST, u.name
                    """
                ),
                {"cid": class_id},
            ).fetchall()
            enrolled = {
                row._mapping["user_id"]: {
                    "name": row._mapping["name"],
                    "roll_number": row._mapping["roll_number"],
                    "section": row._mapping["section"],
                }
                for row in enrolled_students
            }
            enrolled_ids = set(enrolled.keys())

            # Get all sessions for this class
            sessions_result = conn.execute(
                text(
                    """
                    SELECT session_id, start_time, end_time, status
                    FROM attendance_sessions
                    WHERE class_id = :cid
                    ORDER BY start_time DESC
                    """
                ),
                {"cid": class_id},
            ).fetchall()

            if not sessions_result:
                return {"sessions": []}

            session_ids = [row._mapping["session_id"] for row in sessions_result]

            # Get all attendance records for all sessions
            # Build the SQL with proper parameter binding
            if not session_ids:
                attendance_records = []
            else:
                # Use IN clause with proper parameter binding
                placeholders = ",".join([f":sid{i}" for i in range(len(session_ids))])
                params = {f"sid{i}": sid for i, sid in enumerate(session_ids)}
                
                attendance_records = conn.execute(
                    text(
                        f"""
                           SELECT ar.session_id, ar.student_id, u.name AS student_name,
                               ce.roll_number, ce.section, ar.status, ar.marked_at
                        FROM attendance_records ar
                        JOIN users u ON u.user_id = ar.student_id
                        JOIN class_enrollments ce ON ce.student_id = ar.student_id AND ce.class_id = :cid
                        WHERE ar.session_id IN ({placeholders})
                        ORDER BY ar.session_id, ce.roll_number NULLS LAST, ar.student_id, ar.marked_at DESC
                        """
                    ),
                    {**params, "cid": class_id},
                ).fetchall()

            # Group attendance by session and student (taking latest record per student)
            session_attendance = {}
            for record in attendance_records:
                sid = record._mapping["session_id"]
                student_id = record._mapping["student_id"]
                
                if sid not in session_attendance:
                    session_attendance[sid] = {}
                
                # Only keep the first (latest) record per student due to ORDER BY
                if student_id not in session_attendance[sid]:
                    session_attendance[sid][student_id] = {
                        "student_id": student_id,
                        "student_name": record._mapping["student_name"],
                        "roll_number": record._mapping["roll_number"],
                        "section": record._mapping["section"],
                        "status": record._mapping["status"],
                        "marked_at": record._mapping["marked_at"].isoformat() if record._mapping["marked_at"] else None
                    }

            # Build response with complete data
            sessions_data = []
            for session_row in sessions_result:
                sess = dict(session_row._mapping)
                sid = sess["session_id"]
                
                # Get attendance for this session
                session_records = session_attendance.get(sid, {})
                present_ids = set(session_records.keys())
                
                # Add present/late students
                records = list(session_records.values())
                
                # Add absent students (enrolled but not marked)
                for student_id in sorted(enrolled_ids - present_ids):
                    student_info = enrolled.get(student_id, {"name": "Unknown", "roll_number": None, "section": None})
                    records.append({
                        "student_id": student_id,
                        "student_name": student_info["name"],
                        "roll_number": student_info["roll_number"],
                        "section": student_info.get("section"),
                        "status": "ABSENT",
                        "marked_at": None
                    })
                
                # Calculate totals
                totals = {
                    "present": sum(1 for r in records if r["status"] == "PRESENT"),
                    "late": sum(1 for r in records if r["status"] == "LATE"),
                    "absent": sum(1 for r in records if r["status"] == "ABSENT"),
                }
                
                sessions_data.append({
                    "session_id": sess["session_id"],
                    "start_time": sess["start_time"].isoformat() if sess["start_time"] else None,
                    "end_time": sess["end_time"].isoformat() if sess["end_time"] else None,
                    "status": sess["status"],
                    "records": records,
                    "totals": totals
                })

            return {"sessions": sessions_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HELPER FUNCTION FOR NOTIFICATIONS
# ============================================================================

def create_notification(
    user_id: int,
    type: str,
    title: str,
    message: str,
    priority: str = "medium",
    related_class_id: Optional[int] = None,
    related_session_id: Optional[int] = None
):
    """Helper function to create notifications - works with existing table schema"""
    try:
        with engine.connect() as conn:
            # Use only columns that exist in the actual notifications table
            sql = text(
                """
                INSERT INTO notifications 
                (user_id, type, message, is_read, created_at)
                VALUES (:uid, :type, :message, FALSE, CURRENT_TIMESTAMP)
                """
            )
            conn.execute(sql, {
                "uid": user_id,
                "type": type,
                "message": message  # Combine title and message for the message field
            })
            conn.commit()
            print(f"[NOTIFICATION] Created notification for user_id={user_id}, type={type}")
    except Exception as e:
        print(f"[NOTIFICATION] Failed to create notification: {str(e)}")

