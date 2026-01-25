from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text, bindparam
from src.core.database import engine
from src.core.utils import generate_code
from src.queries import create_notification
from src.models.schemas import CreateClassRequest, StartSessionRequest, MarkAttendanceRequest
from src import queries
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

router = APIRouter(tags=["faculty"])

# -------------------- FACULTY DASHBOARD --------------------

@router.get("/api/faculty/sessions/active")
async def get_active_sessions(faculty_id: int):
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
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"faculty_id": faculty_id})
            return [dict(r._mapping) for r in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/faculty/{faculty_id}/classes")
async def get_faculty_classes(faculty_id: int):
    try:
        sql = text(
            """
            SELECT class_id, class_name, join_code
            FROM classes
            WHERE faculty_id = :faculty_id
            ORDER BY class_name
            """
        )
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"faculty_id": faculty_id})
            return [dict(r._mapping) for r in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/faculty/classes")
async def create_faculty_class(class_data: CreateClassRequest):
    try:
        async with engine.begin() as conn:
            # Check if a class with the same name already exists for this faculty
            check_sql = text(
                """
                SELECT class_id FROM classes 
                WHERE class_name = :class_name AND faculty_id = :faculty_id
                LIMIT 1
                """
            )
            existing = await conn.execute(
                check_sql,
                {
                    "class_name": class_data.class_name,
                    "faculty_id": class_data.faculty_id,
                }
            )
            if existing.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail=f"A class with the name '{class_data.class_name}' already exists"
                )
            
            join_code = class_data.join_code or generate_code()
            sql = text(
                """
                INSERT INTO classes (class_name, faculty_id, join_code)
                VALUES (:class_name, :faculty_id, :join_code)
                RETURNING class_id, class_name, join_code
                """
            )
            res = await conn.execute(
                sql,
                {
                    "class_name": class_data.class_name,
                    "faculty_id": class_data.faculty_id,
                    "join_code": join_code,
                },
            )
            return dict(res.fetchone()._mapping)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/faculty/classes/{class_id}")
async def delete_faculty_class(class_id: int):
    try:
        sql = text("DELETE FROM classes WHERE class_id = :class_id RETURNING class_id")
        async with engine.begin() as conn:
            res = await conn.execute(sql, {"class_id": class_id})
            if res.rowcount == 0:
                raise HTTPException(status_code=404, detail="Class not found")
            return {"message": "Class deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/faculty/classes/{class_id}/sessions")
async def start_session(class_id: int, request: StartSessionRequest = None):
    """Start a new attendance session with generated code and optional location"""
    try:
        if request is None:
            request = StartSessionRequest(class_id=class_id)
        
        async with engine.begin() as conn:
            # Check for existing active session
            check_sql = text(
                """
                SELECT session_id, generated_code 
                FROM attendance_sessions 
                WHERE class_id = :class_id AND STATUS = 'ACTIVE'
                LIMIT 1
                """
            )
            result = await conn.execute(check_sql, {"class_id": class_id})
            existing = result.fetchone()
            
            if existing:
                return dict(existing._mapping)
            
            code = generate_code()
            
            # UTC+5:30
            utc_now = datetime.utcnow()
            ist_offset = timedelta(hours=5, minutes=30)
            current_time_ist = utc_now + ist_offset
            
            # Insert with location columns (Requires DB migration)
            sql = text(
                """
                INSERT INTO attendance_sessions (class_id, start_time, status, generated_code, latitude, longitude, radius_meters)
                VALUES (:class_id, :start_time, 'ACTIVE', :code, :lat, :lon, :rad)
                RETURNING session_id, class_id, start_time, status, generated_code, latitude, longitude, radius_meters
                """
            )
            res = await conn.execute(sql, {
                "class_id": class_id, 
                "start_time": current_time_ist, 
                "code": code,
                "lat": request.latitude,
                "lon": request.longitude,
                "rad": request.radius_meters
            })
            
            session_data = dict(res.fetchone()._mapping)
            session_id = session_data['session_id']
            
            # Get class name
            class_sql = text("SELECT class_name FROM classes WHERE class_id = :cid")
            class_row = await conn.execute(class_sql, {"cid": class_id})
            class_row_data = class_row.fetchone()
            class_name = class_row_data[0] if class_row_data else "Unknown Class"
            
            # Get enrolled students
            students_sql = text("SELECT student_id FROM class_enrollments WHERE class_id = :cid")
            students_result = await conn.execute(students_sql, {"cid": class_id})
            students = students_result.fetchall()
             
            # Notifications (DISABLED)
            # Doing this in loop async is fine for now, but batch insert is better.
            # create_notification is atomic, so we just await it.
            # for student in students:
            #     await create_notification(
            #         user_id=student[0],
            #         type="session_start",
            #         title="New Attendance Session",
            #         message=f"{class_name} attendance session is now active. Code: {code}",
            #         priority="high",
            #         related_class_id=class_id,
            #         related_session_id=session_id
            #     )
            
            return session_data
    except Exception as e:
        import traceback
        with open("error_log.txt", "a") as f:
            f.write(f"\n[START_SESSION] ERROR: {str(e)}\n")
            f.write(traceback.format_exc())
        print(f"[START_SESSION] ERROR: {str(e)}")
        # Check if error is due to missing columns
        if "column" in str(e).lower() and ("latitude" in str(e).lower() or "longitude" in str(e).lower()):
             raise HTTPException(status_code=500, detail="Database schema outdated. Please run migration to add location columns.")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/faculty/classes/{class_id}/sessions/{session_id}/end")
async def end_session(class_id: int, session_id: int):
    try:
        async with engine.begin() as conn:
            # Mark absent students
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
            await conn.execute(mark_absent_sql, {"session_id": session_id, "class_id": class_id})
            
            # Update session status
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
            result = await conn.execute(sql, {"session_id": session_id, "class_id": class_id, "end_time": current_time_ist})
            row = result.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Stats & Notifications
            try:
                class_sql = text("SELECT class_name FROM classes WHERE class_id = :cid")
                class_res = await conn.execute(class_sql, {"cid": class_id})
                c_row = class_res.fetchone()
                class_name = c_row[0] if c_row else "Unknown Class"
                
                students_sql = text("SELECT student_id, status FROM attendance_records WHERE session_id = :sid")
                students = (await conn.execute(students_sql, {"sid": session_id})).fetchall()
                
                # for student in students:
                #     sid, status = student[0], student[1]
                #     msg = f"Your attendance has been marked as {status} for {class_name}" if status in ['PRESENT', 'LATE'] else f"You were marked absent for {class_name}"
                #     # Fire and forget notifications to avoid blocking/failing the main request
                #     await create_notification(
                #         user_id=sid,
                #         type="attendance_marked" if status in ['PRESENT', 'LATE'] else "attendance_absent",
                #         title="Attendance Recorded" if status in ['PRESENT', 'LATE'] else "Marked Absent",
                #         message=msg,
                #         priority="low" if status in ['PRESENT', 'LATE'] else "medium",
                #         related_class_id=class_id,
                #         related_session_id=session_id
                #     )
            except Exception as notify_ex:
                print(f"[END_SESSION] Warning: Failed to send notifications: {notify_ex}")
                # Do not raise here, so the session is still closed successfully

            return dict(row._mapping)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ... Additional endpoints ...

@router.get("/api/faculty/classes/{class_id}/sessions/by-date")
async def get_sessions_by_date_endpoint(class_id: int, date: str):
    """
    Get all sessions for a specific class on a specific date.
    Date format: YYYY-MM-DD
    """
    try:
        sql = text(
            """
            SELECT session_id, start_time, end_time, status, generated_code
            FROM attendance_sessions
            WHERE class_id = :class_id 
              AND TO_CHAR(start_time, 'YYYY-MM-DD') = :date
            ORDER BY start_time ASC
            """
        )
        
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"class_id": class_id, "date": date})
            return [dict(r._mapping) for r in result]
    except Exception as e:
        print(f"Error in sessions_by_date: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{date}")
async def sessions_by_date(date: str):
    return await queries.get_sessions_by_date(date)


@router.get("/session/{session_id}/attendance")
async def attendance_for_session(session_id: int):
    return await queries.get_attendance_for_session(session_id)


@router.get("/class/{class_id}/absent/{date}")
async def absent_students(class_id: int, date: str):
    return await queries.get_absent_students_in_class_on_date(class_id, date)


@router.get("/class/{class_id}/students/below_percentage")
async def students_below_percentage(class_id: int, threshold: Optional[float] = 75.0):
    return await queries.get_students_below_percentage(class_id, threshold)


@router.get("/most-active-class")
async def most_active_class():
    result = await queries.get_most_active_class()
    if not result:
        raise HTTPException(status_code=404, detail="No classes or attendance records found")
    return result

@router.get("/faculty-with-classes")
async def faculty_with_classes():
    return await queries.get_faculty_with_classes()

@router.get("/api/faculty/classes/{class_id}/attendance")
async def get_session_attendance(class_id: int):
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
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"class_id": class_id})
            return [dict(r._mapping) for r in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/class/{class_id}/active-session")
async def get_active_session(class_id: int):
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
        async with engine.connect() as conn:
            row = await conn.execute(sql, {"class_id": class_id})
            res = row.fetchone()
            return dict(res._mapping) if res else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/faculty/sessions/{session_id}")
async def get_session_by_id(session_id: int):
    try:
        sql = text("SELECT * FROM attendance_sessions WHERE session_id = :session_id")
        async with engine.connect() as conn:
            row = await conn.execute(sql, {"session_id": session_id})
            res = row.fetchone()
            if not res:
                raise HTTPException(status_code=404, detail="Session not found")
            return dict(res._mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/faculty/classes/{class_id}/students")
async def get_class_students(class_id: int):
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
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"class_id": class_id})
            return [dict(r._mapping) for r in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/faculty/classes/{class_id}/details")
async def faculty_class_details(class_id: int):
    try:
        sql = text(
            """
            SELECT c.class_id, c.class_name, c.join_code, u.name AS faculty_name
            FROM classes c
            JOIN users u ON c.faculty_id = u.user_id
            WHERE c.class_id = :cid
            """
        )
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"cid": class_id})
            row = result.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Class not found")
            return dict(row._mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/attendance")
async def mark_attendance_manual(session_id: int, payload: MarkAttendanceRequest):
    try:
        status = (payload.status or "PRESENT").upper()
        if status not in ("PRESENT", "LATE", "ABSENT"):
            raise HTTPException(status_code=400, detail="Invalid status")

        async with engine.begin() as conn:
            # Check session
            s = (await conn.execute(text("SELECT 1 FROM attendance_sessions WHERE session_id = :sid"), {"sid": session_id})).fetchone()
            if not s:
                 raise HTTPException(status_code=404, detail="Session not found")
            
            # Upsert
            upd = await conn.execute(
                text("UPDATE attendance_records SET status = :st, marked_at = NOW() WHERE session_id = :sid AND student_id = :uid"),
                {"st": status, "sid": session_id, "uid": payload.student_id}
            )
            if upd.rowcount == 0:
                 await conn.execute(
                    text("INSERT INTO attendance_records (session_id, student_id, status, marked_at) VALUES (:sid, :uid, :st, NOW())"),
                    {"sid": session_id, "uid": payload.student_id, "st": status}
                 )
            
            # Notification (DISABLED)
            # class_info = (await conn.execute(
            #     text("SELECT c.class_name FROM classes c JOIN attendance_sessions s ON c.class_id = s.class_id WHERE s.session_id = :sid"),
            #     {"sid": session_id}
            # )).fetchone()
            
            # if class_info:
            #     await create_notification(
            #         user_id=payload.student_id,
            #         type="attendance_marked",
            #         title="Attendance Updated",
            #         message=f"Your attendance has been manually marked as {status} for {class_info[0]}",
            #         priority="medium"
            #     )
            return {"message": "Attendance updated", "status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/faculty/sessions/{session_id}/attendance/flat")
async def get_session_attendance_flat(session_id: int):
    """
    Get attendance for a specific session in a flat format suitable for tables.
    Includes all enrolled students and their status (PRESENT/ABSENT/LATE) for this session.
    """
    try:
        sql = text(
            """
            SELECT 
                ce.student_id,
                u.name as student_name,
                ce.roll_number,
                ce.section,
                COALESCE(ar.status, 'ABSENT') as status,
                ar.marked_at
            FROM class_enrollments ce
            JOIN attendance_sessions s ON s.class_id = ce.class_id
            JOIN users u ON ce.student_id = u.user_id
            LEFT JOIN attendance_records ar ON ar.session_id = s.session_id AND ar.student_id = ce.student_id
            WHERE s.session_id = :session_id
            ORDER BY ce.roll_number
            """
        )
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"session_id": session_id})
            return [dict(r._mapping) for r in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
