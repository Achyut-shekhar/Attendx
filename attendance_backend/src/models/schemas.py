from typing import Optional
from pydantic import BaseModel, validator


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # "STUDENT" or "FACULTY"
    register_key: Optional[str] = None  # Required for FACULTY only


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
    biometric_verified: bool = False   # ← add this

    @validator("latitude")
    def validate_latitude(cls, v):
        if v is not None and (v < -90 or v > 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @validator("longitude")
    def validate_longitude(cls, v):
        if v is not None and (v < -180 or v > 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v

    @validator("accuracy")
    def validate_accuracy(cls, v):
        if v is not None and (v <= 0 or v > 500):
            raise ValueError("Accuracy must be between 0 and 500 meters. A value of 0 indicates spoofed location.")
        return v


class StartSessionRequest(BaseModel):
    class_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[int] = 500


class ForgotPasswordRequest(BaseModel):
    email: str
    frontend_url: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    user_id: int
    password: str  # Require password confirmation for security


class AdminResetPasswordRequest(BaseModel):
    user_id: int
    new_password: str
    admin_key: str


class DeviceToken(BaseModel):
    """Schema for device token registration (mobile app)"""
    id: int
    user_id: int
    device_id: str
    platform: str  # "ios" | "android"
    biometric_enrolled: bool
    expo_push_token: Optional[str]
    created_at: str


class VerifyAdminKeyRequest(BaseModel):
    admin_key: str


class AdminDeregisterDeviceRequest(BaseModel):
    user_id: int
    admin_key: str

