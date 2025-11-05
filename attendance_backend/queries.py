# queries.py
from sqlalchemy import text
from database import get_connection
from typing import List, Dict, Optional

# --- User Management ---
def get_user_by_email(email: str) -> Optional[Dict]:
    sql = text("""
        SELECT 
            user_id as id, 
            name, 
            email, 
            password_hash, 
            role,
            (
                SELECT json_agg(json_build_object(
                    'notification_id', n.notification_id,
                    'type', n.type,
                    'message', n.message,
                    'created_at', n.created_at
                ))
                FROM Notifications n
                WHERE n.user_id = Users.user_id AND n.is_read = false
            ) as notifications
        FROM Users
        WHERE email = :email
    """)
    with get_connection() as conn:
        result = conn.execute(sql, {"email": email}).fetchone()
        return dict(result._mapping) if result else None

def create_user(name: str, email: str, password_hash: str, role: str, roll_number: Optional[int] = None) -> int:
    sql = text("""
        INSERT INTO Users (name, email, password_hash, role, roll_number)
        VALUES (:name, :email, :password_hash, :role, :roll_number)
        RETURNING user_id
    """)
    with get_connection() as conn:
        result = conn.execute(sql, {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "role": role,
            "roll_number": roll_number
        })
        conn.commit()
        return result.fetchone()[0]

def create_class(faculty_id: int, class_name: str, join_code: str) -> int:
    sql = text("""
        INSERT INTO Classes (faculty_id, class_name, join_code)
        VALUES (:faculty_id, :class_name, :join_code)
        RETURNING class_id
    """)
    with get_connection() as conn:
        result = conn.execute(sql, {
            "faculty_id": faculty_id,
            "class_name": class_name,
            "join_code": join_code
        })
        conn.commit()
        return result.fetchone()[0]

def get_faculty_classes(faculty_id: int) -> List[Dict]:
    sql = text("""
        SELECT class_id, class_name, join_code
        FROM Classes
        WHERE faculty_id = :faculty_id
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"faculty_id": faculty_id})
        return [dict(r._mapping) for r in rows]

def create_session(class_id: int, generated_code: str) -> Dict:
    """Create a new attendance session for a class"""
    sql = text("""
        INSERT INTO Attendance_Sessions (class_id, generated_code, start_time, status)
        VALUES (:class_id, :generated_code, CURRENT_TIMESTAMP, 'ACTIVE')
        RETURNING session_id, class_id, generated_code, start_time, status
    """)
    with get_connection() as conn:
        try:
            result = conn.execute(sql, {
                "class_id": class_id,
                "generated_code": generated_code
            })
            conn.commit()
            row = result.fetchone()
            return dict(row._mapping) if row else None
        except Exception as e:
            conn.rollback()
            raise e

def end_session(session_id: int) -> bool:
    """End an attendance session"""
    sql = text("""
        UPDATE Attendance_Sessions 
        SET status = 'CLOSED', end_time = CURRENT_TIMESTAMP
        WHERE session_id = :session_id AND status = 'ACTIVE'
        RETURNING session_id
    """)
    with get_connection() as conn:
        try:
            result = conn.execute(sql, {"session_id": session_id})
            conn.commit()
            return bool(result.fetchone())
        except Exception as e:
            conn.rollback()
            raise e

# --- Sessions that are on a specific date ---
def get_sessions_by_date(date_str: str) -> List[Dict]:
    """
    date_str format: 'YYYY-MM-DD'
    """
    sql = text("""
        SELECT s.session_id, c.class_name, u.name AS faculty_name, s.start_time, s.end_time, s.status
        FROM Attendance_Sessions s
        JOIN Classes c ON s.class_id = c.class_id
        JOIN Users u ON c.faculty_id = u.user_id
        WHERE DATE(s.start_time) = :date
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"date": date_str})
        return [dict(r._mapping) for r in rows]

# --- Check attendance for a session ---
def get_attendance_for_session(session_id: int) -> List[Dict]:
    sql = text("""
        SELECT u.name, ar.status, ar.marked_at
        FROM Attendance_Records ar
        JOIN Users u ON ar.student_id = u.user_id
        WHERE ar.session_id = :session_id
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"session_id": session_id})
        return [dict(r._mapping) for r in rows]

# --- Attendance percentage for a particular student ---
def get_attendance_percentage_for_student(student_id: int) -> Optional[Dict]:
    sql = text("""
        SELECT u.name,
               COUNT(CASE WHEN ar.status='PRESENT' THEN 1 END) * 100.0 / COUNT(*) AS attendance_percentage
        FROM Attendance_Records ar
        JOIN Users u ON ar.student_id = u.user_id
        WHERE u.user_id = :student_id
        GROUP BY u.name;
    """)
    with get_connection() as conn:
        row = conn.execute(sql, {"student_id": student_id}).fetchone()
        return dict(row._mapping) if row else None

# --- List students who were absent in a class on a date ---
def get_absent_students_in_class_on_date(class_id: int, date_str: str) -> List[Dict]:
    sql = text("""
        SELECT u.name, u.roll_number
        FROM Attendance_Records ar
        JOIN Users u ON ar.student_id = u.user_id
        JOIN Attendance_Sessions s ON ar.session_id = s.session_id
        WHERE s.class_id = :class_id
          AND ar.status = 'ABSENT'
          AND DATE(s.start_time) = :date
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"class_id": class_id, "date": date_str})
        return [dict(r._mapping) for r in rows]

# --- Unread notifications for a user on particular date ---
def get_unread_notifications_for_user_on_date(user_id: int, date_str: str) -> List[Dict]:
    sql = text("""
        SELECT type, message, created_at
        FROM Notifications
        WHERE user_id = :user_id
          AND is_read = FALSE
          AND DATE(created_at) = :date
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"user_id": user_id, "date": date_str})
        return [dict(r._mapping) for r in rows]

# --- All attendance notifications for a student ---
def get_attendance_notifications_for_user(user_id: int) -> List[Dict]:
    sql = text("""
        SELECT type, message, created_at
        FROM Notifications
        WHERE user_id = :user_id AND type = 'ATTENDANCE_STATUS'
        ORDER BY created_at DESC
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"user_id": user_id})
        return [dict(r._mapping) for r in rows]

# --- All session notifications for a faculty ---
def get_session_notifications_for_user(user_id: int) -> List[Dict]:
    sql = text("""
        SELECT type, message, created_at
        FROM Notifications
        WHERE user_id = :user_id AND type IN ('SESSION_START','SESSION_END')
        ORDER BY created_at DESC
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"user_id": user_id})
        return [dict(r._mapping) for r in rows]

# --- Students with attendance below a threshold in a class ---
def get_students_below_percentage(class_id: int, threshold: float = 75.0) -> List[Dict]:
    sql = text("""
        SELECT u.name, u.roll_number,
               COUNT(CASE WHEN ar.status='PRESENT' THEN 1 END) * 100.0 / COUNT(*) AS attendance_percentage
        FROM Attendance_Records ar
        JOIN Users u ON ar.student_id = u.user_id
        JOIN Attendance_Sessions s ON ar.session_id = s.session_id
        WHERE s.class_id = :class_id
        GROUP BY u.name, u.roll_number
        HAVING COUNT(CASE WHEN ar.status='PRESENT' THEN 1 END) * 100.0 / COUNT(*) < :threshold
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"class_id": class_id, "threshold": threshold})
        return [dict(r._mapping) for r in rows]

# --- Most active class (highest average attendance) ---
def get_most_active_class() -> Optional[Dict]:
    sql = text("""
        SELECT c.class_name,
               COUNT(CASE WHEN ar.status='PRESENT' THEN 1 END) * 100.0 / COUNT(*) AS avg_attendance_percentage
        FROM Attendance_Records ar
        JOIN Attendance_Sessions s ON ar.session_id = s.session_id
        JOIN Classes c ON s.class_id = c.class_id
        GROUP BY c.class_name
        ORDER BY avg_attendance_percentage DESC
        LIMIT 1
    """)
    with get_connection() as conn:
        row = conn.execute(sql).fetchone()
        return dict(row._mapping) if row else None

# --- Show all faculty and the classes they teach ---
def get_faculty_with_classes() -> List[Dict]:
    sql = text("""
        SELECT u.name AS faculty_name, c.class_name
        FROM Users u
        JOIN Classes c ON u.user_id = c.faculty_id
        WHERE u.role = 'FACULTY'
        ORDER BY u.name, c.class_name
    """)
    with get_connection() as conn:
        rows = conn.execute(sql)
        return [dict(r._mapping) for r in rows]
