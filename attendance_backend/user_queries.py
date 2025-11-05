# User management queries
from sqlalchemy import text
from typing import Optional
from database import get_connection
def get_user_by_email(email: str):
    sql = text("""
        SELECT user_id as id, name, email, password_hash, role
        FROM Users
        WHERE email = :email
    """)
    with get_connection() as conn:
        result = conn.execute(sql, {"email": email}).fetchone()
        return dict(result._mapping) if result else None

def create_user(name: str, email: str, password_hash: str, role: str, roll_number: Optional[int] = None):
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

# Class management queries
def create_class(faculty_id: int, class_name: str, join_code: str):
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

def get_faculty_classes(faculty_id: int):
    sql = text("""
        SELECT class_id, class_name, join_code
        FROM Classes
        WHERE faculty_id = :faculty_id
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"faculty_id": faculty_id})
        return [dict(r._mapping) for r in rows]

def get_student_classes(student_id: int):
    sql = text("""
        SELECT c.class_id, c.class_name, u.name as faculty_name
        FROM Classes c
        JOIN Class_Enrollments ce ON c.class_id = ce.class_id
        JOIN Users u ON c.faculty_id = u.user_id
        WHERE ce.student_id = :student_id
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"student_id": student_id})
        return [dict(r._mapping) for r in rows]

def join_class(student_id: int, join_code: str):
    # First get the class_id
    sql_get_class = text("""
        SELECT class_id FROM Classes WHERE join_code = :join_code
    """)
    
    sql_enroll = text("""
        INSERT INTO Class_Enrollments (class_id, student_id, joined_at)
        VALUES (:class_id, :student_id, CURRENT_TIMESTAMP)
    """)
    
    with get_connection() as conn:
        class_result = conn.execute(sql_get_class, {"join_code": join_code}).fetchone()
        if not class_result:
            return None
        
        try:
            conn.execute(sql_enroll, {
                "class_id": class_result[0],
                "student_id": student_id
            })
            conn.commit()
            return class_result[0]
        except:
            conn.rollback()
            return None