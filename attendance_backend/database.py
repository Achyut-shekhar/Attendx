# database.py
import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get DB URL from .env
DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL not found — set it in your .env file")

# Create SQLAlchemy engine
engine: Engine = create_engine(DB_URL, pool_pre_ping=True)

def get_connection():
    """
    Use this in a `with` statement:
      with get_connection() as conn:
          result = conn.execute(...)
    This returns a SQLAlchemy Connection object.
    """
    return engine.connect()

if __name__ == "__main__":
    try:
        with engine.connect() as conn:
            print("✅ Connected to PostgreSQL successfully!")
            
            # Fetch all table names
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema='public'
            """))
            tables = [row[0] for row in result.fetchall()]

            if tables:
                print(f"📋 Total Tables: {len(tables)}")
                for t in tables:
                    print(" -", t)
            else:
                print("⚠️ No tables found in the 'public' schema.")
                
    except Exception as e:
        print("❌ Error connecting or fetching tables:", e)
