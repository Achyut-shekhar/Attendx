"""
Verify and add roll_number column to class_enrollments table
"""
from sqlalchemy import create_engine, text, inspect
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL not found — set it in your .env file")

engine = create_engine(DB_URL, pool_pre_ping=True)

print("Checking database schema...")
print("-" * 50)

try:
    with engine.connect() as conn:
        # Check if roll_number column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'class_enrollments' 
            AND column_name = 'roll_number'
        """))
        
        column_exists = result.fetchone() is not None
        
        if column_exists:
            print("✅ roll_number column already exists in class_enrollments table")
        else:
            print("❌ roll_number column NOT found. Adding it now...")
            
            # Add the column
            conn.execute(text("""
                ALTER TABLE class_enrollments 
                ADD COLUMN roll_number VARCHAR(50)
            """))
            
            # Add index
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_class_enrollments_roll_number 
                ON class_enrollments(class_id, roll_number)
            """))
            
            conn.commit()
            print("✅ Successfully added roll_number column and index")
        
        # Show current schema
        print("\nCurrent class_enrollments table columns:")
        columns = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'class_enrollments'
            ORDER BY ordinal_position
        """))
        
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")
            
except Exception as e:
    print(f"❌ Error: {e}")
    raise
