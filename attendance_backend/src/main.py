from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from src.core.config import FRONTEND_URL
from src.routers import auth, faculty, student, notifications

app = FastAPI(title="Attendance Management API")

# CORS
origins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    FRONTEND_URL,
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(faculty.router)
app.include_router(student.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {"message": "Attendance API is up. See /docs for endpoints."}

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "Attendance Management API",
        "database": "connected" 
    }

# AWS Lambda Handler
handler = Mangum(app)
