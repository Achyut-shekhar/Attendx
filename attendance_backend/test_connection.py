"""
Quick test script to verify Neon database connection
Run this to ensure your .env is configured correctly
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

DB_URL = os.getenv("DB_URL")
SECRET_KEY = os.getenv("SECRET_KEY")

print("=== Environment Check ===")
print(f"✓ DB_URL loaded: {'Yes' if DB_URL else 'No'}")
print(f"✓ SECRET_KEY loaded: {'Yes' if SECRET_KEY else 'No'}")

if not DB_URL:
    print("\n❌ ERROR: DB_URL not found in .env file")
    exit(1)

if not SECRET_KEY or SECRET_KEY == "your-secret-key-change-this-in-production":
    print("\n⚠️  WARNING: Please set a strong SECRET_KEY in your .env file")

print("\n=== Testing Database Connection ===")
try:
    engine = create_engine(DB_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        # Test connection
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✓ Connected to PostgreSQL")
        print(f"  Version: {version}")
        
        # Check tables
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result.fetchall()]
        
        print(f"\n✓ Found {len(tables)} tables in public schema:")
        for table in tables:
            print(f"  - {table}")
        
        print("\n✅ SUCCESS: Database connection is working!")
        print("\nYou can now run: uvicorn main:app --reload")
        
except Exception as e:
    print(f"\n❌ ERROR: Failed to connect to database")
    print(f"   {str(e)}")
    print("\nPlease check:")
    print("  1. Your .env file has the correct DB_URL")
    print("  2. The password in DB_URL is correct")
    print("  3. Your Neon database is active (not paused)")
    exit(1)
