# queries.py
from sqlalchemy import text
from database import get_connection
from typing import List, Dict, Optional

# ---------------------------------------------------------
# ✅ Sessions on a specific date
# ---------------------------------------------------------
def get_sessions_by_date(date_str: str) -> List[Dict]:
    sql = text("""
        SELECT 
            s.session_id, 
            c.class_name, 
            u.name AS faculty_name, 
            s.start_time, 
            s.end_time, 
            s.status
        FROM Attendance_Sessions s
        JOIN Classes c ON s.class_id = c.class_id
        JOIN Users u ON c.faculty_id = u.user_id
        WHERE DATE(s.start_time) = :date
        ORDER BY s.start_time ASC
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"date": date_str})
        return [dict(r._mapping) for r in rows]


# ---------------------------------------------------------
# ✅ Full attendance for one session
# ---------------------------------------------------------
def get_attendance_for_session(session_id: int) -> List[Dict]:
    sql = text("""
        SELECT 
            u.name AS student_name, 
            ar.status, 
            ar.marked_at
        FROM Attendance_Records ar
        JOIN Users u ON ar.student_id = u.user_id
        WHERE ar.session_id = :session_id
        ORDER BY u.name
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"session_id": session_id})
        return [dict(r._mapping) for r in rows]


# ---------------------------------------------------------
# ✅ Attendance percentage for a student
# ---------------------------------------------------------
def get_attendance_percentage_for_student(student_id: int) -> Optional[Dict]:
    sql = text("""
        SELECT 
            u.name,
            COUNT(CASE WHEN ar.status='PRESENT' THEN 1 END) * 100.0 / COUNT(*) 
            AS attendance_percentage
        FROM Attendance_Records ar
        JOIN Users u ON ar.student_id = u.user_id
        WHERE u.user_id = :student_id
        GROUP BY u.name
    """)
    with get_connection() as conn:
        row = conn.execute(sql, {"student_id": student_id}).fetchone()
        return dict(row._mapping) if row else None


# ---------------------------------------------------------
# ✅ Students absent in a class on a date
# ---------------------------------------------------------
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


# ---------------------------------------------------------
# ✅ Notifications
# ---------------------------------------------------------
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


def get_session_notifications_for_user(user_id: int) -> List[Dict]:
    sql = text("""
        SELECT type, message, created_at
        FROM Notifications
        WHERE user_id = :user_id 
          AND type IN ('SESSION_START','SESSION_END')
        ORDER BY created_at DESC
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"user_id": user_id})
        return [dict(r._mapping) for r in rows]


# ---------------------------------------------------------
# ✅ Students below attendance threshold
# ---------------------------------------------------------
def get_students_below_percentage(class_id: int, threshold: float = 75.0) -> List[Dict]:
    sql = text("""
        SELECT 
            u.name, 
            u.roll_number,
            COUNT(CASE WHEN ar.status='PRESENT' THEN 1 END) * 100.0 / COUNT(*) 
            AS attendance_percentage
        FROM Attendance_Records ar
        JOIN Attendance_Sessions s ON ar.session_id = s.session_id
        JOIN Users u ON ar.student_id = u.user_id
        WHERE s.class_id = :class_id
        GROUP BY u.name, u.roll_number
        HAVING COUNT(CASE WHEN ar.status='PRESENT' THEN 1 END) * 100.0 / COUNT(*) < :threshold
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {"class_id": class_id, "threshold": threshold})
        return [dict(r._mapping) for r in rows]


# ---------------------------------------------------------
# ✅ Most active class
# ---------------------------------------------------------
def get_most_active_class() -> Optional[Dict]:
    sql = text("""
        SELECT 
            c.class_name,
            COUNT(CASE WHEN ar.status='PRESENT' THEN 1 END) * 100.0 / COUNT(*) 
            AS avg_attendance_percentage
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


# ---------------------------------------------------------
# ✅ Faculty with classes
# ---------------------------------------------------------
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

