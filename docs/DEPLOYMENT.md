# Deployment Guide

## Target Environment
This application is optimized for **Render.com** (specifically the Free Tier), but can technically run on any platform supporting Python and Node.js.

## Prerequisites
- **GitHub Repository**: The code must be pushed to a public or private GitHub repository.
- **Render Account**: A valid account on Render.com.
- **PostgreSQL Database**: An external Postgres database (e.g., Render Postgres or Supabase).

## Critical Configuration

To ensure the application runs stably on low-resource environments, the following configurations are mandatory:

### 1. Build Command
We use a unified build command to install dependencies and apply migrations:
```bash
pip install -r requirements.txt && python database_manager.py
```
*Note: Ensure `database_manager.py` is in the root directory.*

### 2. Start Command
The backend is served using Uvicorn:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```
*Note: `main.py` is located in the root `attendance_backend` folder (after restructuring).*

### 3. Environment Variables
Set the following secrets in your hosting dashboard:
- `DATABASE_URL`: Full connection string (e.g., `postgresql://user:pass@host/dbname`)
- `SECRET_KEY`: A random string for JWT encryption.
- `ALGORITHM`: `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES`: `10080` (7 days)

## Troubleshooting Deployments

### "Module not found: src"
- **Cause:** Python path issue.
- **Fix:** Ensure you are running `main:app`, NOT `src.main:app`. We moved `main.py` to the root of the backend folder to simplify imports.

### "500 Internal Server Error" on Login
- **Cause:** Database connectivity or missing tables.
- **Fix:** Check logs. If "relation does not exist", your migrations failed. run `python database_manager.py` manually locally or via the build command.

### "Timeout" / "High Latency"
- **Cause:** Too many concurrent connections or aggressive polling.
- **Fix:** We have already patched this by increasing frontend polling intervals to 10s-20s and disabling expensive notification writes. Do not revert these changes without upgrading your server plan.
