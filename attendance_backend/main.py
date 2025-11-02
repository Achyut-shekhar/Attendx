# main.py


from fastapi import FastAPI, HTTPException
from typing import Optional
import queries

app = FastAPI(title="Attendance Management API")

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
