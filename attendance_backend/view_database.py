from database import get_connection
from sqlalchemy import text

def view_database_contents():
    try:
        with get_connection() as conn:
            # Get users
            print("\n=== 👥 Users ===")
            result = conn.execute(text("""
                SELECT user_id, name, email, role, roll_number 
                FROM Users
                ORDER BY user_id
            """))
            users = result.fetchall()
            for user in users:
                print(f"ID: {user[0]} | Name: {user[1]} | Email: {user[2]} | Role: {user[3]} | Roll#: {user[4]}")

            # Get classes
            print("\n=== 📚 Classes ===")
            result = conn.execute(text("""
                SELECT c.class_id, c.class_name, c.join_code, u.name as faculty_name
                FROM Classes c
                JOIN Users u ON c.faculty_id = u.user_id
                ORDER BY c.class_id
            """))
            classes = result.fetchall()
            for class_ in classes:
                print(f"ID: {class_[0]} | Name: {class_[1]} | Join Code: {class_[2]} | Faculty: {class_[3]}")

            # Get class enrollments
            print("\n=== ✍️ Class Enrollments ===")
            result = conn.execute(text("""
                SELECT ce.enrollment_id, c.class_name, u.name as student_name, ce.joined_at
                FROM Class_Enrollments ce
                JOIN Classes c ON ce.class_id = c.class_id
                JOIN Users u ON ce.student_id = u.user_id
                ORDER BY ce.enrollment_id
            """))
            enrollments = result.fetchall()
            for enrollment in enrollments:
                print(f"ID: {enrollment[0]} | Class: {enrollment[1]} | Student: {enrollment[2]} | Joined: {enrollment[3]}")

            # Get attendance sessions
            print("\n=== 📅 Attendance Sessions ===")
            result = conn.execute(text("""
                SELECT s.session_id, c.class_name, s.status, s.start_time, s.end_time, s.generated_code
                FROM Attendance_Sessions s
                JOIN Classes c ON s.class_id = c.class_id
                ORDER BY s.session_id
            """))
            sessions = result.fetchall()
            for session in sessions:
                print(f"ID: {session[0]} | Class: {session[1]} | Status: {session[2]} | Started: {session[3]} | Ended: {session[4]} | Code: {session[5]}")

            # Get attendance records
            print("\n=== ✓ Attendance Records ===")
            result = conn.execute(text("""
                SELECT ar.record_id, c.class_name, u.name as student_name, ar.status, ar.marked_at
                FROM Attendance_Records ar
                JOIN Attendance_Sessions s ON ar.session_id = s.session_id
                JOIN Classes c ON s.class_id = c.class_id
                JOIN Users u ON ar.student_id = u.user_id
                ORDER BY ar.record_id
            """))
            records = result.fetchall()
            for record in records:
                print(f"ID: {record[0]} | Class: {record[1]} | Student: {record[2]} | Status: {record[3]} | Marked: {record[4]}")

            # Get notifications
            print("\n=== 🔔 Notifications ===")
            result = conn.execute(text("""
                SELECT n.notification_id, u.name as user_name, n.type, n.message, n.is_read, n.created_at
                FROM Notifications n
                JOIN Users u ON n.user_id = u.user_id
                ORDER BY n.notification_id
            """))
            notifications = result.fetchall()
            for notif in notifications:
                print(f"ID: {notif[0]} | User: {notif[1]} | Type: {notif[2]} | Message: {notif[3]} | Read: {notif[4]} | Created: {notif[5]}")

    except Exception as e:
        print("❌ Error viewing database:", e)

if __name__ == "__main__":
    view_database_contents()