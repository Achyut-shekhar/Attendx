# main.py
from fastapi import FastAPI, HTTPException
from typing import Optional
import queries
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

app = FastAPI(title="Attendance Management API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
load_dotenv()

# Connect to your Postgres DB
DB_URL = os.getenv("DB_URL")
engine = create_engine(DB_URL)


@app.get("/")
def root():
    return {"message": "Attendance API is up. See /docs for endpoints."}

@app.get("/sessions/{date}")
def sessions_by_date(date: str):
    # date: 'YYYY-MM-DD'
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
        # If no date provided, return all unread ones (optionally you can write another query)
        sql_result = queries.get_unread_notifications_for_user_on_date(user_id, date=str(date) if date else "1970-01-01")
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

@app.get("/most-active-class")
def most_active_class():
    result = queries.get_most_active_class()
    if not result:
        raise HTTPException(status_code=404, detail="No classes or attendance records found")
    return result

@app.get("/faculty-with-classes")
def faculty_with_classes():
    return queries.get_faculty_with_classes()

# Login model
class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/login")
def login(request: LoginRequest):
    """
    Basic login route — checks email and password from Users table (no hashing).
    """
    with engine.connect() as conn:
        query = text("SELECT user_id, name, email, password_hash, role FROM Users WHERE email = :email")
        result = conn.execute(query, {"email": request.email}).fetchone()

        if not result:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user = dict(result._mapping)

        # Simple text comparison (since you are not hashing passwords)
        if request.password != user["password_hash"]:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {
            "message": "Login successful",
            "user_id": user["user_id"],
            "name": user["name"],
            "role": user["role"],
        }
