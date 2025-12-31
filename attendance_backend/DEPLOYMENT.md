# Backend Deployment Guide - Neon PostgreSQL

## 1. Environment Setup

### Local Development

1. **Copy the environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your Neon credentials:**

   ```env
   DB_URL=postgresql://neondb_owner:<YOUR_PASSWORD>@ep-quiet-meadow-a43qiwpc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   SECRET_KEY=<GENERATE_A_STRONG_SECRET_KEY>
   ```

3. **Generate a strong SECRET_KEY (Python):**
   ```python
   import secrets
   print(secrets.token_urlsafe(32))
   ```

### Install Dependencies

```bash
pip install -r requirements.txt
```

## 2. Test Database Connection

Run this quick test:

```python
from database import get_connection

with get_connection() as conn:
    result = conn.execute("SELECT version()")
    print(result.fetchone())
```

## 3. Run the Server Locally

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Visit:

- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/

## 4. Verify API Endpoints

Test these endpoints in the Swagger UI (http://localhost:8000/docs):

- GET `/users` - Fetch all users
- GET `/classes` - Fetch all classes
- POST `/auth/login` - Test authentication

## 5. CORS Configuration

If deploying to a different domain, update CORS origins in `main.py`:

```python
allow_origins=[
    "http://localhost:5173",        # Local frontend
    "https://yourdomain.com",       # Production frontend
],
```

## 6. Production Deployment Options

### Option A: Render.com

1. Create a new Web Service
2. Connect your GitHub repo
3. Set environment variables in Render dashboard
4. Deploy command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Option B: Railway.app

1. Create new project
2. Add environment variables
3. Railway will auto-detect FastAPI

### Option C: Vercel (Serverless)

1. Install Vercel CLI: `npm i -g vercel`
2. Create `vercel.json` (see below)
3. Deploy: `vercel --prod`

#### vercel.json:

```json
{
  "builds": [
    {
      "src": "main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "main.py"
    }
  ]
}
```

## 7. Environment Variables for Production

Set these in your hosting platform:

- `DB_URL` - Your Neon connection string (with actual password)
- `SECRET_KEY` - A strong random secret key

## 8. Security Checklist

- ✅ Use strong SECRET_KEY (not the default)
- ✅ Never commit `.env` to Git (it's in `.gitignore`)
- ✅ Use `sslmode=require` for Neon connection
- ✅ Update CORS origins to only allow your frontend domain
- ✅ Use HTTPS in production

## Troubleshooting

### Connection Issues

- Verify Neon database is active (not paused)
- Check connection string format
- Ensure `sslmode=require` is present

### Authentication Errors

- Verify SECRET_KEY is set correctly
- Check JWT token expiration settings

### CORS Errors

- Add your frontend URL to `allow_origins`
- Ensure `allow_credentials=True` is set
