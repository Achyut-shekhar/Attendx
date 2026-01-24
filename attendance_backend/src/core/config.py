import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Database
DB_URL = os.getenv("DB_URL")

# CORS / Frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
