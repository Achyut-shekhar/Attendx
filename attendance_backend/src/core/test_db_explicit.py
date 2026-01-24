import asyncio
from src.core.database import engine
from sqlalchemy import text
import traceback

async def test():
    try:
        print("Testing DB connection...")
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("DB Connection Success!")
    except Exception as e:
        print(f"DB Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
