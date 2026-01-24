from src.core.database import engine
from sqlalchemy import text
import asyncio

async def check_schema():
    print("Checking schema...")
    async with engine.connect() as conn:
        try:
            # Query information_schema to see columns
            result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance_sessions'"))
            print("Columns in attendance_sessions:")
            for row in result:
                print(f" - {row.column_name} ({row.data_type})")
        except Exception as e:
            print(f"Error checking schema: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
