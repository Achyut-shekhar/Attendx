# main.py
from fastapi import FastAPI, HTTPException, Query
from typing import Optional, List, Dict, Any
import queries
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text, bindparam
import os
from dotenv import load_dotenv
import random
import string

app = FastAPI(title="Attendance Management API")

# -------------------- CORS --------------------
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

# -------------------- ENV & DB --------------------
load_dotenv()
DB_URL = os.getenv("DB_URL")
engine = create_engine(DB_URL)

# -------------------- HELPERS --------------------
def generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


@app.get("/")
def root():
    return {"message": "Attendance API is up. See /docs for endpoints."}


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


@app.get("/user/{user_id}/notifications/unread")
def unread_notifications(user_id: int, date: Optional[str] = None):
    if date:
        return queries.get_unread_notifications_for_user_on_date(user_id, date)
    else:
        return queries.get_unread_notifications_for_user_on_date(
            user_id, date=str(date) if date else "1970-01-01"
        )


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


# -------------------- MODELS --------------------
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
    status: Optional[str] = "PRESENT"  # PRESENT | LATE | ABSENT


class SubmitAttendanceCode(BaseModel):
    student_id: int
    code: str


# -------------------- LOGIN --------------------
@app.post("/login")
def login(request: LoginRequest):
    with engine.connect() as conn:
        q = text(
            "SELECT user_id, name, email, password_hash, role FROM users WHERE email = :email"
        )
        row = conn.execute(q, {"email": request.email}).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        user = dict(row._mapping)
        if request.password != user["password_hash"]:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return {
            "message": "Login successful",
            "user_id": user["user_id"],
            "name": user["name"],
            "role": user["role"],
        }


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
def start_session(class_id: int):
    """Start a new attendance session with generated code"""
    try:
        code = generate_code()
        sql = text(
            """
            INSERT INTO attendance_sessions (class_id, start_time, status, generated_code)
            VALUES (:class_id, NOW(), 'ACTIVE', :code)
            RETURNING session_id, class_id, start_time, status, generated_code
            """
        )
        with engine.connect() as conn:
            res = conn.execute(sql, {"class_id": class_id, "code": code})
            conn.commit()
            return dict(res.fetchone()._mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/faculty/classes/{class_id}/sessions/{session_id}/end")
def end_session(class_id: int, session_id: int):
    try:
        sql = text(
            """
            UPDATE attendance_sessions
            SET end_time = NOW(), status = 'CLOSED'
            WHERE session_id = :session_id AND class_id = :class_id
            RETURNING *
            """
        )
        with engine.connect() as conn:
            row = conn.execute(
                sql, {"session_id": session_id, "class_id": class_id}
            ).fetchone()
            conn.commit()
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            return dict(row._mapping)
    except Exception as e:
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
                SELECT u.user_id, u.name, u.email
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
                       ar.status,
                       ar.marked_at
                FROM attendance_records ar
                JOIN users u ON u.user_id = ar.student_id
                WHERE ar.session_id IN :sids
                ORDER BY ar.session_id, ar.student_id, ar.marked_at DESC
                """
            ).bindparams(bindparam("sids", expanding=True))

            present_rows = [
                dict(r._mapping)
                for r in conn.execute(records_sql, {"sids": tuple(session_ids)})
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
            SELECT u.user_id, u.name, u.email
            FROM class_enrollments ce
            JOIN users u ON ce.student_id = u.user_id
            WHERE ce.class_id = :class_id
            ORDER BY u.name
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
            SELECT c.class_id, c.class_name, c.join_code, u.name as faculty_name
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
        find_sql = text("SELECT class_id FROM classes WHERE join_code = :join_code")
        enroll_sql = text(
            """
            INSERT INTO class_enrollments (student_id, class_id, enrolled_at)
            VALUES (:student_id, :class_id, NOW())
            ON CONFLICT DO NOTHING
            RETURNING enrollment_id
            """
        )
        with engine.connect() as conn:
            class_row = conn.execute(
                find_sql, {"join_code": join_data.join_code}
            ).fetchone()
            if not class_row:
                raise HTTPException(status_code=404, detail="Invalid join code")
            class_id = class_row[0]
            res = conn.execute(
                enroll_sql,
                {"student_id": join_data.student_id, "class_id": class_id},
            )
            conn.commit()
            if res.rowcount == 0:
                return {"message": "Already enrolled"}
            return {"message": "Successfully joined class", "class_id": class_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Student submits code (PRESENT)
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

            sql_enroll = text(
                "SELECT 1 FROM class_enrollments WHERE student_id = :sid AND class_id = :cid"
            )
            if not conn.execute(
                sql_enroll, {"sid": payload.student_id, "cid": class_id}
            ).fetchone():
                raise HTTPException(status_code=403, detail="Student not enrolled")

            # Upsert (update first, else insert)
            update_sql = text(
                """
                UPDATE attendance_records
                SET status = 'PRESENT', marked_at = NOW()
                WHERE session_id = :ses AND student_id = :sid
                """
            )
            res = conn.execute(
                update_sql, {"ses": session_id, "sid": payload.student_id}
            )
            if res.rowcount == 0:
                insert_sql = text(
                    """
                    INSERT INTO attendance_records (session_id, student_id, status, marked_at)
                    VALUES (:ses, :sid, 'PRESENT', NOW())
                    """
                )
                conn.execute(insert_sql, {"ses": session_id, "sid": payload.student_id})

            conn.commit()
            return {
                "message": "Attendance marked successfully",
                "session_id": session_id,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Manual mark — supports PRESENT/LATE/ABSENT
@app.post("/session/{session_id}/attendance")
def mark_attendance_manual(session_id: int, payload: MarkAttendanceRequest):
    try:
        status = (payload.status or "PRESENT").upper()
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
                conn.execute(
                    text(
                        """
                        INSERT INTO attendance_records (session_id, student_id, status, marked_at)
                        VALUES (:sid, :uid, :st, NOW())
                        """
                    ),
                    {"sid": session_id, "uid": payload.student_id, "st": status},
                )
            conn.commit()
            return {
                "message": "Attendance updated",
                "session_id": session_id,
                "student_id": payload.student_id,
                "status": status,
            }
    except Exception as e:
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
            return [
                dict(r._mapping)
                for r in conn.execute(
                    sql, {"class_id": class_id, "student_id": student_id}
                )
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- NEW: list sessions on a date ---
@app.get("/api/faculty/classes/{class_id}/sessions/by-date")
def list_sessions_by_date(
    class_id: int, date: str = Query(..., description="YYYY-MM-DD")
):
    try:
        sql = text(
            """
            SELECT session_id, class_id, start_time, end_time, status
            FROM attendance_sessions
            WHERE class_id = :cid AND DATE(start_time) = CAST(:d AS DATE)
            ORDER BY start_time ASC
            """
        )
        with engine.connect() as conn:
            rows = conn.execute(sql, {"cid": class_id, "d": date}).fetchall()
            return [dict(r._mapping) for r in rows]
    except Exception as e:
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
                    SELECT u.user_id, u.name
                    FROM class_enrollments ce
                    JOIN users u ON u.user_id = ce.student_id
                    WHERE ce.class_id = :cid
                    ORDER BY u.name
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
                           ar.status,
                           ar.marked_at
                    FROM attendance_records ar
                    JOIN users u ON u.user_id = ar.student_id
                    WHERE ar.session_id = :sid
                    ORDER BY ar.student_id, ar.marked_at DESC
                    """
                ),
                {"sid": session_id},
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
