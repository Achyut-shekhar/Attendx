from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from src.core.config import FRONTEND_URL
from src.routers import auth, faculty, student

app = FastAPI(title="Attendance Management API")

# CORS — only allow known origins, never wildcard
origins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://10.69.6.127:8000",  # Expo Go on physical device
    FRONTEND_URL,
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


@app.get("/")
def root():
    return {"message": "Attendance API is up. See /docs for endpoints."}


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "Attendance Management API",
        "database": "connected",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

import json
import asyncio

# Create the standard Mangum handler for API Gateway (HTTP)
_mangum_handler = Mangum(app)


def handler(event, context):
    """
    Unified AWS Lambda handler that routes between API Gateway HTTP events
    and SQS Queue events.
    """
    # 1. Check if the event came from an SQS Queue
    if (
        "Records" in event
        and len(event["Records"]) > 0
        and event["Records"][0].get("eventSource") == "aws:sqs"
    ):

        async def process_sqs_batch():
            from src.routers.student import _submit_code_internal, SubmitAttendanceCode

            failed_message_ids = []

            for record in event["Records"]:
                message_id = record.get("messageId")
                try:
                    # SQS sends the payload as a JSON string inside the 'body'
                    body = json.loads(record["body"])
                    payload = SubmitAttendanceCode(**body)

                    # ---> EXECUTE YOUR BULK DATABASE INSERT HERE <---
                    await _submit_code_internal(payload)
                    print(
                        f"✅ SQS Processed Attendance for Student {payload.student_id}"
                    )

                except Exception as e:
                    print(f"❌ Error processing SQS message {message_id}: {e}")
                    # CRITICAL: If this one student fails, add their ID to the failure list
                    # DO NOT throw an error, or the whole batch will fail!
                    failed_message_ids.append({"itemIdentifier": message_id})

            # Return the exact JSON structure AWS requires for partial failures
            # AWS will delete the successful messages and put the failed ones back in the queue
            return {"batchItemFailures": failed_message_ids}

        # Run the async logic using a new event loop safely
        new_loop = asyncio.new_event_loop()
        try:
            return new_loop.run_until_complete(process_sqs_batch())
        finally:
            new_loop.close()

    # 2. To fix the Mangum asyncio event loop bug in newer Python versions
    import threading

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        asyncio.set_event_loop(asyncio.new_event_loop())

    # 3. Otherwise, treat it as a standard HTTP request from API Gateway
    return _mangum_handler(event, context)
