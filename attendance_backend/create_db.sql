import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

# ============================================
# Load environment variables from .env
# ============================================
load_dotenv()

# Make sure .env has: DATABASE_URL=postgresql://postgres:achyut@localhost:5432/attendance
DATABASE_URL = os.getenv("DB_URL")

if not DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL not found — please set it in your .env file.")

# ============================================
# Create SQLAlchemy engine (connection pool)
# ============================================
engine: Engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)

def get_connection():
    """
    Use this function with a 'with' statement:
      with get_connection() as conn:
          result = conn.execute(...)
    Returns a SQLAlchemy Connection object.
    """
    return engine.connect()

def test_connection():
    """
    Test the database connection and list all tables.
    Run this file directly:  python database.py
    """
    try:
        with get_connection() as conn:
            result = conn.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
            ))
            tables = result.fetchall()
            
            if tables:
                print("✅ Connected successfully! Tables found:")
                for table in tables:
                    print("  -", table[0])
            else:
                print("⚠️ Connected to database but no tables found. Have you imported your schema?")
    except Exception as e:
        print("❌ Connection failed:", str(e))

# ============================================
# Run test when executed directly
# ============================================
if __name__ == "__main__":
    test_connection()
