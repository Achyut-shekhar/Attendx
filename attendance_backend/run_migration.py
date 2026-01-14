"""
Run database migration to add roll_number and section columns to class_enrollments table
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL not found — set it in your .env file")

engine = create_engine(DB_URL, pool_pre_ping=True)

# Read migration SQL
with open("add_roll_number.sql", "r") as f:
    migration_sql = f.read()

print("Running migration to add roll_number/section columns...")
print("-" * 50)

try:
    with engine.connect() as conn:
        # Execute migration
        conn.execute(text(migration_sql))
        conn.commit()
        print("✅ Migration successful!")
        print("   - Added/verified roll_number and section columns on class_enrollments")
        print("   - Created indexes on (class_id, roll_number) and (class_id, section)")
        
except Exception as e:
    print(f"❌ Migration failed: {e}")
    raise
