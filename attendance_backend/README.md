# Attendance Backend (Refactored)

This backend has been refactored for AWS Lambda deployment using a modular structure.

## Structure

- `src/`
  - `core/`: Configuration, database setup, security.
  - `models/`: Pydantic schemas.
  - `routers/`: FastAPI route handlers (auth, faculty, student, notifications).
  - `main.py`: Entry point with Mangum handler.
- `scripts/`: SQL migration scripts.
- `template.yaml`: AWS SAM configuration.
- `legacy/`: Old monolithic files (backed up).

## Deployment

### Prerequisites
- AWS CLI installed and configured.
- AWS SAM CLI installed.
- PostgreSQL database (e.g., Neon, RDS) reachable from AWS.

### Deploy with SAM

```bash
sam build
sam deploy --guided
```

You will be prompted for:
- Stack Name: `attendance-backend`
- Region: `us-east-1` (or your choice)
- Parameter DatabaseUrl: Your connection string
- Parameter SecretKey: Your secret key
- Parameter FrontendUrl: Your frontend URL

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn src.main:app --reload
```

## Database Migration

Run the SQL script in `scripts/add_location_columns.sql` to update your database schema for the new location tracking features.
