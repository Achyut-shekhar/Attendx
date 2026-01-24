from src.core.database import engine
from sqlalchemy import text
import asyncio

async def run_migration():
    print("Starting migration...")
    async with engine.begin() as conn:
        try:
            print("Dropping old columns (if any)...")
            await conn.execute(text("ALTER TABLE attendance_sessions DROP COLUMN IF EXISTS latitude CASCADE"))
            await conn.execute(text("ALTER TABLE attendance_sessions DROP COLUMN IF EXISTS longitude CASCADE"))
            await conn.execute(text("ALTER TABLE attendance_sessions DROP COLUMN IF EXISTS radius_meters CASCADE"))
            
            print("Adding new columns...")
            await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN latitude FLOAT"))
            await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN longitude FLOAT"))
            await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN radius_meters INTEGER DEFAULT 50"))
            
            print("Verifying...")
            result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance_sessions'"))
            columns = [row.column_name for row in result]
            print(f"Current columns: {columns}")
            
            if 'latitude' in columns and 'longitude' in columns:
                print("SUCCESS: Migration completed.")
            else:
                print("FAILURE: Columns not found after migration.")
                
        except Exception as e:
            print(f"Migration Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
