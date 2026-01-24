from typing import Optional
from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # "STUDENT" or "FACULTY"


class CreateClassRequest(BaseModel):
    class_name: str
    section: str = "A"
    join_code: str
    faculty_id: int


class JoinClassRequest(BaseModel):
    join_code: str
    student_id: int
    roll_number: str  # Student's roll number for the class
    section: Optional[str] = None  # Optional section label (A/B/etc)


class MarkAttendanceRequest(BaseModel):
    session_id: int
    student_id: int
    status: Optional[str] = "PRESENT"  # PRESENT | LATE | ABSENT


class SubmitAttendanceCode(BaseModel):
    student_id: int
    code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None  # GPS accuracy in meters


class StartSessionRequest(BaseModel):
    class_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[int] = 50
