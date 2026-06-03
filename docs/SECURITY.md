# AttendX — Security Hardening Documentation

> **Date**: June 2026  
> **Branch**: `manualsearchAndAttendanceEdit`  
> **Author**: Achyut Shekhar Singh  

---

## 1. Overview

This document describes the security hardening applied to the AttendX attendance portal in response to a private vulnerability report. The changes address **4 classes of vulnerabilities**:

| # | Vulnerability | Severity | Status |
|---|---|---|---|
| 1 | No JWT authentication on API endpoints | 🔴 Critical | ✅ Fixed |
| 2 | CORS wildcard allowing any origin | 🔴 Critical | ✅ Fixed |
| 3 | GPS location spoofing on attendance | 🟠 High | ✅ Hardened |
| 4 | Unrestricted account registration | 🟡 Medium | ✅ Fixed |

---

## 2. JWT Authentication System

### 2.1 How It Works

```
┌─────────┐         POST /login          ┌──────────┐
│ Frontend │ ──────────────────────────── │ Backend  │
│          │    email + password          │          │
│          │ ◄─────────────────────────── │          │
│          │    { access_token: "eyJ..." }│          │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  Every subsequent request:               │
     │  Authorization: Bearer eyJhbG...         │
     │ ────────────────────────────────────────► │
     │                                         │
     │  Backend verifies token with SECRET_KEY  │
     │  Extracts: user_id, role, expiry         │
     │  No database query needed                │
```

### 2.2 Token Structure

The JWT contains:
```json
{
  "sub": "42",          // user_id (stringified)
  "role": "STUDENT",    // or "FACULTY"
  "exp": 1749123456     // expiry (7 days from login)
}
```

### 2.3 Key Files

| File | Purpose |
|---|---|
| [security.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/core/security.py) | Token creation, verification, role guards |
| [config.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/core/config.py) | SECRET_KEY, FACULTY_REGISTER_KEY env vars |
| [api.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/services/api.js) | Axios interceptor — auto-attaches JWT to every request |
| [AuthContext.jsx](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/contexts/AuthContext.jsx) | Stores token in localStorage on login |

### 2.4 Role-Based Access Control

Two dependency functions gate access:

```python
# In security.py

def require_faculty(current_user = Depends(verify_token)):
    if current_user["role"] != "FACULTY":
        raise HTTPException(403, "Faculty access required")
    return current_user

def require_student(current_user = Depends(verify_token)):
    if current_user["role"] != "STUDENT":
        raise HTTPException(403, "Student access required")
    return current_user
```

**Every** endpoint in [student.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/routers/student.py) uses `Depends(require_student)`.  
**Every** endpoint in [faculty.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/routers/faculty.py) uses `Depends(require_faculty)`.

### 2.5 Ownership Checks

Even with a valid student token, a student **cannot access another student's data**:

```python
# Example from student.py
async def get_enrolled_classes(student_id: int, current_user = Depends(require_student)):
    if current_user["user_id"] != student_id:
        raise HTTPException(403, "Access denied")
```

### 2.6 Public Endpoints (No Auth Required)

| Endpoint | Reason |
|---|---|
| `POST /login` | User needs to authenticate before getting a token |
| `POST /register` | New users need to create an account |
| `POST /forgot-password` | User may not have a valid session |
| `POST /reset-password` | Uses a separate reset token |
| `GET /health` | Monitoring/uptime checks |

---

## 3. Frontend Auth Integration

### 3.1 Axios JWT Interceptor

In [api.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/services/api.js), a request interceptor automatically attaches the token:

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

A response interceptor handles expired tokens:

```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      // Token expired — force re-login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

### 3.2 API Client Files — All Migrated to Axios

All frontend API files now use the authenticated `api` axios instance instead of raw `fetch()`:

| File | Status |
|---|---|
| [api.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/services/api.js) (services) | ✅ Has JWT interceptor |
| [attendance.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/api/attendance.js) | ✅ Migrated to axios |
| [classes.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/api/classes.js) | ✅ Migrated to axios |
| [auth.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/api/auth.js) | ✅ Public endpoints — no migration needed |
| [FacultyDashboard.jsx](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/pages/FacultyDashboard.jsx) | ✅ Inline fetch calls migrated |
| [AttendanceContext.jsx](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/contexts/AttendanceContext.jsx) | ✅ Role check added — only calls faculty API for faculty users |

---

## 4. CORS Hardening

### Before
```python
# main.py — INSECURE: wildcard allows ANY website to call the API
origins = [..., "*"]
```

### After
```python
# main.py — Only known origins
origins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    FRONTEND_URL,        # From .env (production URL)
]
```

> [!IMPORTANT]
> When deploying, set `FRONTEND_URL` in your environment to the production frontend URL (e.g., `https://attendx.vercel.app`). Without this, the frontend won't be able to make API calls.

---

## 5. Anti-Location-Spoofing Measures

### 5.1 What Was Vulnerable

Students could:
1. See their raw latitude/longitude in the UI
2. Copy coordinates from someone in the classroom
3. Use browser DevTools to send arbitrary coordinates

### 5.2 Defenses Applied

| Defense | File | Description |
|---|---|---|
| **Hidden coordinates** | [LocationCapture.jsx](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/components/attendance/LocationCapture.jsx) | Raw lat/lon no longer displayed — only shows "Location captured" with accuracy |
| **Coordinate validation** | [schemas.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/models/schemas.py) | Pydantic rejects `lat > 90`, `lon > 180`, `accuracy <= 0` or `> 500` |
| **Tighter radius** | [student.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/routers/student.py) | Default radius reduced from 500m → 100m |
| **Tighter accuracy buffer** | student.py | Accuracy cap reduced from 100m → 50m |
| **60-second cooldown** | student.py | Prevents brute-force location guessing (same student, same session) |

### 5.3 Pydantic Validators

```python
# In schemas.py — SubmitAttendanceCode
@validator("latitude")
def validate_latitude(cls, v):
    if v is not None and (v < -90 or v > 90):
        raise ValueError("Latitude must be between -90 and 90")

@validator("accuracy")
def validate_accuracy(cls, v):
    if v is not None and (v <= 0 or v > 500):
        raise ValueError("Accuracy must be between 0 and 500 meters")
```

> [!WARNING]
> **Location spoofing cannot be 100% prevented in a web app.** A determined attacker with a browser extension or rooted phone can still fake GPS. Full anti-spoofing requires native mobile apps with Google Play Integrity / Apple DeviceCheck APIs. The measures above make spoofing significantly harder but not impossible.

---

## 6. Registration Key System

### 6.1 How It Works

- **Students** → Register freely, no key needed
- **Faculty** → Must provide a registration key (`FACULTY_REGISTER_KEY` from `.env`)

### 6.2 Flow

```
Frontend (Register.jsx)              Backend (auth.py)
────────────────────                 ──────────────────
1. User selects "Faculty" role       
2. Registration Key field appears    
3. User enters key + details         
4. POST /register { ...,             5. if role == "FACULTY":
   register_key: "ATTENDX..." }         if key != FACULTY_REGISTER_KEY:
                                             → 403 "Invalid registration key"
                                         else:
                                             → Create account ✅
                                     
                                     6. if role == "STUDENT":
                                             → Create account ✅ (no key check)
```

### 6.3 Changing the Key

Edit the `.env` file and restart the backend:

```bash
# In attendance_backend/.env
FACULTY_REGISTER_KEY=YOUR_NEW_KEY_HERE
```

> [!IMPORTANT]
> After changing `.env`, you **must restart** the backend (`py main.py`). Uvicorn's `--reload` only watches `.py` file changes, not `.env` changes.

---

## 7. Environment Variables Reference

All required env vars are documented in [.env.example](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/.env.example):

| Variable | Required | Description |
|---|---|---|
| `DB_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing secret — **must be random, never commit** |
| `RESET_ADMIN_KEY` | ✅ | Admin password reset key |
| `FACULTY_REGISTER_KEY` | ✅ | Key faculty must enter to register |
| `FRONTEND_URL` | ✅ (production) | Frontend URL for CORS |
| `EMAIL_QUEUE_URL` | Optional | AWS SQS queue for emails |
| `RESEND_API_KEY` | Optional | Resend email API key |
| `RESEND_FROM_EMAIL` | Optional | Sender email address |

> [!CAUTION]
> The `.env` file contains secrets. It is in `.gitignore` and must **never** be committed to Git. For deployment (AWS/Render), set these as environment variables in the platform's dashboard.

---

## 8. SQS Lambda Compatibility

The `submit_code` endpoint was split into two functions to maintain Lambda/SQS compatibility:

| Function | Auth | Used By |
|---|---|---|
| `submit_code()` | ✅ JWT + ownership + cooldown | HTTP API (student web app) |
| `_submit_code_internal()` | ❌ None (trusted server-side) | AWS Lambda SQS handler |

The SQS handler in [main.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/main.py) calls `_submit_code_internal()` directly, bypassing auth since it runs server-side in a trusted Lambda environment.

---

## 9. Files Changed Summary

### Backend
| File | Changes |
|---|---|
| [config.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/core/config.py) | Added `FACULTY_REGISTER_KEY`, removed insecure defaults, mandatory env vars |
| [security.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/core/security.py) | Added `require_faculty`, `require_student`, JWT sub string fix |
| [schemas.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/models/schemas.py) | Added `register_key` (optional), Pydantic validators for lat/lon/accuracy |
| [auth.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/routers/auth.py) | Faculty registration key validation |
| [student.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/routers/student.py) | JWT auth on all 6 endpoints, ownership checks, anti-spoofing, cooldown |
| [faculty.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/src/routers/faculty.py) | JWT auth on all 24 endpoints |
| [main.py](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/main.py) | CORS wildcard removed, SQS handler updated |
| [.env](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/.env) | Created with all required env vars |
| [.env.example](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/attendance_backend/.env.example) | Template for deployment |

### Frontend
| File | Changes |
|---|---|
| [api.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/services/api.js) | Added JWT request/response interceptors |
| [attendance.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/api/attendance.js) | Migrated from fetch → authenticated axios |
| [classes.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/api/classes.js) | Migrated from fetch → authenticated axios |
| [auth.js](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/api/auth.js) | Added auth header to deleteAccount |
| [Register.jsx](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/pages/Register.jsx) | Registration key field (faculty only) |
| [LocationCapture.jsx](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/components/attendance/LocationCapture.jsx) | Hidden raw coordinates |
| [FacultyDashboard.jsx](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/pages/FacultyDashboard.jsx) | Migrated inline fetch calls to axios |
| [AttendanceContext.jsx](file:///c:/Users/achyu/OneDrive/Documents/GitHub/facul-student-hub/frontend/src/contexts/AttendanceContext.jsx) | Role check before faculty API calls |

---

## 10. Testing Checklist

| Test | Expected Result |
|---|---|
| `curl GET /api/student/classes?student_id=1` (no token) | 403 Forbidden |
| `curl GET /api/faculty/1/classes` (no token) | 403 Forbidden |
| `curl POST /attendance/submit-code` (no token) | 403 Forbidden |
| `POST /register` without `register_key` (as FACULTY) | 422 / 403 |
| `POST /register` with wrong key (as FACULTY) | 403 Invalid key |
| `POST /register` as STUDENT (no key) | ✅ Succeeds |
| Submit attendance with `latitude: 999` | 422 Validation Error |
| Submit attendance with `accuracy: 0` | 422 Validation Error |
| Submit attendance twice within 60s | 429 Rate Limited |
| Student token hitting faculty endpoint | 403 Faculty access required |
| Faculty token hitting student endpoint | 403 Student access required |
| Student A's token with `student_id` of Student B | 403 Access denied |
