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


@app.get("/most-active-class")
def most_active_class():
    result = queries.get_most_active_class()
    if not result:
        raise HTTPException(
            status_code=404, detail="No classes or attendance records found"
        )
    return result


@app.get("/faculty-with-classes")
def faculty_with_classes():
    return queries.get_faculty_with_classes()


class LoginRequest(BaseModel):
    email: str
    password: str

class CreateClassRequest(BaseModel):
    class_name: str
    section: str = "A"
    join_code: str
    faculty_id: int

class JoinClassRequest(BaseModel):
    join_code: str
    student_id: int

class MarkAttendanceRequest(BaseModel):
    session_id: int
    student_id: int


@app.post("/login")
def login(request: LoginRequest):
    """
    Basic login route — checks email and password from Users table (no hashing).
    """
    with engine.connect() as conn:
        query = text(
            "SELECT user_id, name, email, password_hash, role FROM users WHERE email = :email"
        )
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


# ==================== FACULTY ENDPOINTS ====================
@app.get("/api/faculty/sessions/active")
def get_active_sessions(faculty_id: int):
    """Return all currently active attendance sessions for a faculty"""
    try:
        sql = text("""
            SELECT 
                s.session_id,
                s.class_id,
                c.class_name,
                s.start_time,
                s.status
            FROM attendance_sessions s
            JOIN classes c ON s.class_id = c.class_id
            WHERE c.faculty_id = :faculty_id AND s.status = 'ACTIVE'
            ORDER BY s.start_time DESC
        """)
        with engine.connect() as conn:
            rows = conn.execute(sql, {"faculty_id": faculty_id})
            return [dict(r._mapping) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/faculty/{faculty_id}/classes")
def get_faculty_classes(faculty_id: int):
    try:
        print(f"🔍 Backend received request for faculty_id: {faculty_id}")
        sql = text("""
            SELECT class_id, class_name, join_code
            FROM classes
            WHERE faculty_id = :faculty_id
            ORDER BY class_name
        """)
        with engine.connect() as conn:
            rows = conn.execute(sql, {"faculty_id": faculty_id})
            results = [dict(r._mapping) for r in rows]
            print(f"📊 Query returned {len(results)} classes: {results}")
            return results
    except Exception as e:
        print(f"❌ Error fetching classes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class CreateClassRequest(BaseModel):
    class_name: str
    section: str = "A"
    join_code: str
    faculty_id: int

@app.post("/api/faculty/classes")
def create_faculty_class(class_data: CreateClassRequest):
    """Create a new class for a faculty member"""
    try:
        import random
        import string
        
        print(f"📝 Creating class with data: {class_data}")
        print(f"   - class_name: {class_data.class_name}")
        print(f"   - faculty_id: {class_data.faculty_id}")
        print(f"   - join_code: {class_data.join_code}")
        
        # Generate a random join code if not provided or empty
        join_code = class_data.join_code if class_data.join_code else ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        sql = text(
            """
            INSERT INTO classes (class_name, faculty_id, join_code)
            VALUES (:class_name, :faculty_id, :join_code)
            RETURNING class_id, class_name, join_code
        """
        )
        with engine.connect() as conn:
            result = conn.execute(
                sql,
                {
                    "class_name": class_data.class_name,
                    "faculty_id": class_data.faculty_id,
                    "join_code": join_code,
                },
            )
            conn.commit()
            row = result.fetchone()
            print(f"✅ Class created successfully: {row}")
            return dict(row._mapping) if row else None
    except Exception as e:
        print(f"❌ Error creating class: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/faculty/classes/{class_id}")
def delete_faculty_class(class_id: int):
    """Delete a class"""
    try:
        sql = text(
            """
            DELETE FROM classes
            WHERE class_id = :class_id
            RETURNING class_id
        """
        )
        with engine.connect() as conn:
            result = conn.execute(sql, {"class_id": class_id})
            conn.commit()
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Class not found")
            return {"message": "Class deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/faculty/classes/{class_id}/sessions")
def start_session(class_id: int):
    """Start an attendance session for a class"""
    try:
        import random
        import string
        
        # Generate a random code for attendance
        generated_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        sql = text(
            """
            INSERT INTO attendance_sessions (class_id, start_time, status, generated_code)
            VALUES (:class_id, NOW(), 'ACTIVE', :generated_code)
            RETURNING session_id, class_id, start_time, status, generated_code
        """
        )
        with engine.begin() as conn:
            result = conn.execute(sql, {"class_id": class_id, "generated_code": generated_code})
            row = result.fetchone()
            return dict(row._mapping) if row else None
    except Exception as e:
        print(f"Error in start_session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/faculty/classes/{class_id}/sessions/{session_id}/end")
def end_session(class_id: int, session_id: int):
    """End an active attendance session"""
    try:
        print(f"DEBUG: Ending session - class_id={class_id}, session_id={session_id}")
        sql = text(
            """
            UPDATE attendance_sessions 
            SET end_time = NOW(), status = 'CLOSED'
            WHERE session_id = :session_id AND class_id = :class_id
            RETURNING session_id, class_id, start_time, end_time, status
        """
        )
        with engine.begin() as conn:
            result = conn.execute(sql, {"session_id": session_id, "class_id": class_id})
            row = result.fetchone()
            if not row:
                print(f"DEBUG: Session not found - session_id={session_id}, class_id={class_id}")
                raise HTTPException(status_code=404, detail="Session not found")
            print(f"DEBUG: Session ended successfully - {dict(row._mapping)}")
            return dict(row._mapping)
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in end_session: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/faculty/classes/{class_id}")
def get_session_attendance(class_id: int):
    """Get attendance records for a class"""
    try:
        sql = text(
            """
            SELECT 
                s.session_id,
                s.start_time,
                s.end_time,
                s.status,
                u.name as student_name,
                ar.status as attendance_status,
                ar.marked_at
            FROM attendance_sessions s
            LEFT JOIN attendance_records ar ON s.session_id = ar.session_id
            LEFT JOIN users u ON ar.student_id = u.user_id
            WHERE s.class_id = :class_id
            ORDER BY s.start_time DESC, u.name
        """
        )
        with engine.connect() as conn:
            rows = conn.execute(sql, {"class_id": class_id})
            return [dict(r._mapping) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    


# ==================== STUDENT ENDPOINTS ====================


@app.get("/api/student/classes")
def get_enrolled_classes(student_id: int):
    """Get all classes a student is enrolled in"""
    try:
        print(f"DEBUG: Fetching classes for student_id={student_id}")
        sql = text(
            """
            SELECT 
                c.class_id, 
                c.class_name, 
                c.join_code,
                u.name as faculty_name
            FROM class_enrollments ce
            JOIN classes c ON ce.class_id = c.class_id
            JOIN users u ON c.faculty_id = u.user_id
            WHERE ce.student_id = :student_id
            ORDER BY c.class_name
        """
        )
        with engine.connect() as conn:
            rows = conn.execute(sql, {"student_id": student_id})
            result = [dict(r._mapping) for r in rows]
            print(f"DEBUG: Found {len(result)} classes for student {student_id}")
            return result
    except Exception as e:
        print(f"ERROR in get_enrolled_classes for student {student_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/student/classes/join")
def join_class(join_data: JoinClassRequest):
    """Join a class using a join code"""
    try:
        # First, find the class by join code
        find_class_sql = text(
            """
            SELECT class_id FROM classes WHERE join_code = :join_code
        """
        )
        
        # Then enroll the student
        enroll_sql = text(
            """
            INSERT INTO class_enrollments (student_id, class_id, enrolled_at)
            VALUES (:student_id, :class_id, NOW())
            ON CONFLICT (student_id, class_id) DO NOTHING
            RETURNING enrollment_id
        """
        )
        
        with engine.begin() as conn:
            # Find class
            class_result = conn.execute(
                find_class_sql, {"join_code": join_data.join_code}
            ).fetchone()
            
            if not class_result:
                raise HTTPException(status_code=404, detail="Invalid join code")
            
            class_id = class_result[0]
            
            # Enroll student
            result = conn.execute(enroll_sql, {"student_id": join_data.student_id, "class_id": class_id})
            
            if result.rowcount == 0:
                return {"message": "Already enrolled in this class"}
            
            return {"message": "Successfully joined class", "class_id": class_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/debug/check-enrollments")
def debug_check_enrollments():
    """Debug endpoint to check enrollments in database"""
    try:
        with engine.connect() as conn:
            # Check all enrollments
            sql = text("""
                SELECT ce.*, c.class_name, u.name as student_name
                FROM class_enrollments ce
                LEFT JOIN classes c ON ce.class_id = c.class_id
                LEFT JOIN users u ON ce.student_id = u.user_id
            """)
            rows = conn.execute(sql)
            result = [dict(r._mapping) for r in rows]
            return {
                "enrollments_count": len(result),
                "enrollments": result
            }
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/faculty/classes/{class_id}/students")
def get_class_students(class_id: int):
    """Get all students enrolled in a class"""
    try:
        sql = text(
            """
            SELECT u.user_id, u.name, u.email
            FROM users u
            INNER JOIN class_enrollments ce ON u.user_id = ce.student_id
            WHERE ce.class_id = :class_id
            ORDER BY u.name
        """
        )
        with engine.connect() as conn:
            rows = conn.execute(sql, {"class_id": class_id})
            result = [dict(r._mapping) for r in rows]
            print(f"DEBUG: get_class_students - class_id={class_id}, students={result}")
            return result
    except Exception as e:
        print(f"ERROR in get_class_students: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/student/attendance/mark")
def mark_attendance(attendance_data: MarkAttendanceRequest):
    """Mark attendance for a student in an active session"""
    try:
        sql = text(
            """
            INSERT INTO attendance_records (session_id, student_id, status, marked_at)
            VALUES (:session_id, :student_id, 'PRESENT', NOW())
            ON CONFLICT (session_id, student_id) DO NOTHING
            RETURNING record_id
        """
        )
        with engine.connect() as conn:
            result = conn.execute(
                sql,
                {
                    "session_id": attendance_data.session_id,
                    "student_id": attendance_data.student_id,
                },
            )
            conn.commit()
            
            if result.rowcount == 0:
                return {"message": "Attendance already marked"}
            
            return {"message": "Attendance marked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/student/classes/{class_id}")
def get_student_class_details(class_id: int, student_id: int):
    """Get class details for a student"""
    try:
        sql = text(
            """
            SELECT 
                c.class_id,
                c.class_name,
                c.faculty_id,
                u.name as faculty_name,
                c.attendance_mode,
                COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END)::FLOAT / 
                  NULLIF(COUNT(ar.record_id), 0) * 100 as attendance_rate
            FROM classes c
            JOIN users u ON c.faculty_id = u.user_id
            LEFT JOIN class_enrollments ce ON c.class_id = ce.class_id AND ce.student_id = :student_id
            LEFT JOIN attendance_sessions asess ON asess.class_id = c.class_id
            LEFT JOIN attendance_records ar ON ar.session_id = asess.session_id AND ar.student_id = :student_id
            WHERE c.class_id = :class_id
            GROUP BY c.class_id, c.class_name, c.faculty_id, u.name, c.attendance_mode
        """
        )
        with engine.connect() as conn:
            result = conn.execute(sql, {"class_id": class_id, "student_id": student_id}).fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Class not found")
            
            row_dict = dict(result._mapping)
            # Handle NULL attendance_rate
            if row_dict['attendance_rate'] is None:
                row_dict['attendance_rate'] = 0
            else:
                row_dict['attendance_rate'] = round(row_dict['attendance_rate'], 2)
            
            return row_dict
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in get_student_class_details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/student/classes/{class_id}/attendance")
def get_student_attendance_records(class_id: int, student_id: int):
    """Get attendance records for a student in a specific class"""
    try:
        sql = text(
            """
            SELECT 
                ar.record_id,
                ar.session_id,
                ar.student_id,
                ar.status,
                ar.marked_at as recorded_at,
                c.class_name
            FROM attendance_records ar
            JOIN attendance_sessions asess ON ar.session_id = asess.session_id
            JOIN classes c ON asess.class_id = c.class_id
            WHERE asess.class_id = :class_id AND ar.student_id = :student_id
            ORDER BY ar.marked_at DESC
        """
        )
        with engine.connect() as conn:
            rows = conn.execute(sql, {"class_id": class_id, "student_id": student_id})
            return [dict(r._mapping) for r in rows]
    except Exception as e:
        print(f"ERROR in get_student_attendance_records: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))