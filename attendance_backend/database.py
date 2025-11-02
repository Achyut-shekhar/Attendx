# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

# Load .env
load_dotenv()

DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL not found — set it in your .env file")

# Create SQLAlchemy engine (connection pool managed by SQLAlchemy)
engine: Engine = create_engine(DB_URL, pool_pre_ping=True)

def get_connection():
    """
    Use this in a `with` statement:
      with get_connection() as conn:
          result = conn.execute(...)
    This returns a SQLAlchemy Connection object.
    """
    return engine.connect()



import psycopg2

def test_connection():
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="attendance_management",
            user="anshikanautiyal",  # replace if needed
            password="your_password_here"  # your local postgres password
        )
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
        tables = cur.fetchall()
        print("✅ Connected successfully! Tables found:")
        for table in tables:
            print("-", table[0])
        cur.close()
        conn.close()
    except Exception as e:
        print("❌ Connection failed:", e)

if __name__ == "__main__":
    test_connection()
