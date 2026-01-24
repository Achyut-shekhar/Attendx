from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from src.core.database import engine
from src.core.utils import calculate_distance
from src.queries import create_notification
from src.models.schemas import JoinClassRequest, SubmitAttendanceCode
from src import queries
from typing import Optional

router = APIRouter(tags=["student"])

@router.get("/api/student/classes")
async def get_enrolled_classes(student_id: int):
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
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"student_id": student_id})
            return [dict(r._mapping) for r in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/student/classes/join")
async def join_class(join_data: JoinClassRequest):
    try:
        section_value = (join_data.section or "").strip() or None
        if section_value:
            section_value = section_value[:50]
        
        async with engine.begin() as conn:
            find_sql = text("SELECT class_id FROM classes WHERE join_code = :join_code")
            class_row = (await conn.execute(find_sql, {"join_code": join_data.join_code})).fetchone()
            
            if not class_row:
                raise HTTPException(status_code=404, detail="Invalid join code")
            class_id = class_row[0]
            
            check_enroll = text("SELECT 1 FROM class_enrollments WHERE student_id = :student_id AND class_id = :class_id")
            existing = (await conn.execute(check_enroll, {"student_id": join_data.student_id, "class_id": class_id})).fetchone()
            
            if existing:
                return {"message": "Already enrolled", "class_id": class_id}
            
            enroll_sql = text(
                """
                INSERT INTO class_enrollments (student_id, class_id, roll_number, section)
                VALUES (:student_id, :class_id, :roll_number, :section)
                """
            )
            await conn.execute(enroll_sql, {
                "student_id": join_data.student_id,
                "class_id": class_id,
                "roll_number": join_data.roll_number,
                "section": section_value
            })
            
            # Notifications
            student_sql = text("SELECT name FROM users WHERE user_id = :uid")
            s_row = (await conn.execute(student_sql, {"uid": join_data.student_id})).fetchone()
            student_name = s_row[0] if s_row else "Unknown Student"
            
            class_detail_sql = text("SELECT class_name, faculty_id FROM classes WHERE class_id = :cid")
            c_row = (await conn.execute(class_detail_sql, {"cid": class_id})).fetchone()
            class_name = c_row[0] if c_row else "Unknown Class"
            faculty_id = c_row[1] if c_row else None
            
            await create_notification(
                user_id=join_data.student_id,
                type="class_joined",
                title="Joined Class",
                message=f"You have successfully joined {class_name}",
                priority="low",
                related_class_id=class_id
            )
            
            if faculty_id:
                await create_notification(
                    user_id=faculty_id,
                    type="student_joined",
                    title="New Student",
                    message=f"{student_name} has joined your {class_name} class",
                    priority="low",
                    related_class_id=class_id
                )
            
            return {"message": "Successfully joined class", "class_id": class_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attendance/submit-code")
async def submit_code(payload: SubmitAttendanceCode):
    try:
        # Changed: Select location columns from DB
        sql_session = text(
            """
            SELECT session_id, class_id, latitude, longitude, radius_meters
            FROM attendance_sessions
            WHERE generated_code = :code AND status = 'ACTIVE'
            LIMIT 1
            """
        )
        async with engine.begin() as conn:
            session = (await conn.execute(sql_session, {"code": payload.code})).fetchone()
            if not session:
                raise HTTPException(status_code=400, detail="Invalid or expired code")
            
            session_id = session.session_id
            class_id = session.class_id
            session_lat = session.latitude
            session_lon = session.longitude
            radius_meters = session.radius_meters or 50
            
            # Check enrollment
            sql_enroll = text("SELECT 1 FROM class_enrollments WHERE student_id = :sid AND class_id = :cid")
            if not (await conn.execute(sql_enroll, {"sid": payload.student_id, "cid": class_id})).fetchone():
                raise HTTPException(status_code=403, detail="Student not enrolled in this class")
            
            status = "PRESENT"
            distance = None
            location_message = ""
            
            if session_lat and session_lon:
                if payload.latitude and payload.longitude:
                    distance = calculate_distance(
                        float(session_lat), float(session_lon),
                        payload.latitude, payload.longitude
                    )
                    student_accuracy = payload.accuracy or 0
                    accuracy_buffer = min(student_accuracy, 100)
                    effective_radius = radius_meters + accuracy_buffer
                    
                    if distance > effective_radius:
                        status = "ABSENT"
                        location_message = f" - Outside zone (Distance: {distance:.0f}m, Allowed: {effective_radius:.0f}m)"
                    else:
                        location_message = f" - Within zone ({distance:.0f}m)"
                else:
                    raise HTTPException(status_code=400, detail="Location is required for this session.")
            
            # Upsert
            update_sql = text(
                """
                UPDATE attendance_records
                SET status = :status, marked_at = NOW()
                WHERE session_id = :ses AND student_id = :sid
                """
            )
            res = await conn.execute(update_sql, {"status": status, "ses": session_id, "sid": payload.student_id})
            if res.rowcount == 0:
                insert_sql = text(
                    """
                    INSERT INTO attendance_records (session_id, student_id, status, marked_at)
                    VALUES (:ses, :sid, :status, NOW())
                    """
                )
                await conn.execute(insert_sql, {"ses": session_id, "sid": payload.student_id, "status": status})
            
            # Notifications
            class_sql = text("SELECT class_name, faculty_id FROM classes WHERE class_id = :cid")
            c_row = (await conn.execute(class_sql, {"cid": class_id})).fetchone()
            class_name = c_row.class_name
            faculty_id = c_row.faculty_id
            
            student_sql = text("SELECT name FROM users WHERE user_id = :uid")
            s_row = (await conn.execute(student_sql, {"uid": payload.student_id})).fetchone()
            student_name = s_row.name or "A student"
            
            if status == "ABSENT":
                await create_notification(
                    user_id=payload.student_id,
                    type="attendance_marked",
                    title="Attendance: Outside Zone",
                    message=f"You were outside the classroom radius for {class_name}{location_message}",
                    priority="high",
                    related_class_id=class_id,
                    related_session_id=session_id
                )
            else:
                 await create_notification(
                    user_id=payload.student_id,
                    type="attendance_marked",
                    title="Attendance Confirmed",
                    message=f"Your attendance has been recorded as {status} for {class_name}{location_message}",
                    priority="low",
                    related_class_id=class_id,
                    related_session_id=session_id
                )
            
            await create_notification(
                user_id=faculty_id,
                type="student_marked",
                title="Student Attendance",
                message=f"{student_name} marked attendance for {class_name} ({status})",
                priority="low",
                related_class_id=class_id,
                related_session_id=session_id
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/student/classes/{class_id}")
async def get_student_class_details(class_id: int, student_id: int):
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
        async with engine.connect() as conn:
            row = (await conn.execute(sql, {"class_id": class_id, "student_id": student_id})).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Class not found")
            return dict(row._mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/{student_id}/attendance-percentage")
async def attendance_percentage_student(student_id: int):
    result = await queries.get_attendance_percentage_for_student(student_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Student or records not found")
    return result
@router.get("/api/student/classes/{class_id}/attendance")
async def get_student_attendance_history(class_id: int, student_id: int):
    try:
        sql = text(
            """
            SELECT 
                s.session_id, 
                s.start_time, 
                ar.status, 
                ar.marked_at
            FROM attendance_sessions s
            LEFT JOIN attendance_records ar ON s.session_id = ar.session_id AND ar.student_id = :student_id
            WHERE s.class_id = :class_id
            AND s.status != 'ACTIVE'
            ORDER BY s.start_time DESC
            """
        )
        async with engine.connect() as conn:
            result = await conn.execute(sql, {"class_id": class_id, "student_id": student_id})
            return [dict(r._mapping) for r in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
