import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("FATAL: SECRET_KEY environment variable is not set. The application cannot start.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Database
DB_URL = os.getenv("DB_URL")

# CORS / Frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Password Reset Admin Key
RESET_ADMIN_KEY = os.getenv("RESET_ADMIN_KEY")
if not RESET_ADMIN_KEY:
    raise RuntimeError("FATAL: RESET_ADMIN_KEY environment variable is not set. The application cannot start.")

# Registration Keys — required to create accounts (prevents unauthorized sign-ups)
# Student registration is open — no key required
# Faculty registration key is required below

FACULTY_REGISTER_KEY = os.getenv("FACULTY_REGISTER_KEY")
if not FACULTY_REGISTER_KEY:
    raise RuntimeError("FATAL: FACULTY_REGISTER_KEY environment variable is not set. The application cannot start.")
