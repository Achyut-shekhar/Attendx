# database_manager.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Get DB URL from .env
DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL not found — set it in your .env file")

# Create SQLAlchemy engine
engine: Engine = create_engine(DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Get database session.
    Use this as a dependency in FastAPI endpoints:
    async def endpoint(db: Session = Depends(get_db)):
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database with schema"""
    with open('schema.sql', 'r') as f:
        schema = f.read()
    
    with engine.connect() as conn:
        # Split the schema into individual statements
        statements = schema.split(';')
        for statement in statements:
            if statement.strip():
                conn.execute(text(statement))
        conn.commit()

def verify_db_connection():
    """Verify database connection and schema"""
    try:
        with engine.connect() as conn:
            # Check if tables exist
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema='public'
            """))
            tables = [row[0] for row in result.fetchall()]
            
            required_tables = [
                'users', 'classes', 'class_enrollments', 
                'attendance_sessions', 'attendance_records', 
                'notifications'
            ]
            
            missing_tables = [table for table in required_tables 
                            if table.lower() not in [t.lower() for t in tables]]
            
            if missing_tables:
                print("Missing tables:", missing_tables)
                print("Initializing database schema...")
                init_db()
                return False
                
            print("✅ Database schema verified")
            return True
            
    except Exception as e:
        print("❌ Database connection error:", str(e))
        return False

if __name__ == "__main__":
    verify_db_connection()