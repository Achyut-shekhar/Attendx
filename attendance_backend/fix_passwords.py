"""
Script to fix existing user passwords in the database
Converts plain text passwords to bcrypt hashed passwords
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

DB_URL = os.getenv("DB_URL")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("=== Password Migration Script ===\n")

if not DB_URL:
    print("❌ ERROR: DB_URL not found in .env file")
    exit(1)

try:
    engine = create_engine(DB_URL, pool_pre_ping=True)
    
    with engine.connect() as conn:
        # Get all users
        result = conn.execute(text("SELECT user_id, email, password_hash FROM users"))
        users = result.fetchall()
        
        print(f"Found {len(users)} users in database\n")
        
        updated_count = 0
        for user in users:
            user_id, email, password_hash = user
            
            # Check if password is already hashed with bcrypt
            if password_hash and password_hash.startswith("$2b$"):
                print(f"✓ {email} - Already has bcrypt hash")
            else:
                # This is a plain text password, need to hash it
                print(f"⚠️  {email} - Has plain text password: '{password_hash}'")
                
                # Ask user if they want to hash it or set a new password
                print(f"   Options:")
                print(f"   1. Hash the existing password ('{password_hash}')")
                print(f"   2. Set a new password")
                print(f"   3. Skip this user")
                
                choice = input(f"   Enter choice (1/2/3): ").strip()
                
                if choice == "1":
                    # Hash the existing password
                    new_hash = pwd_context.hash(password_hash)
                    conn.execute(
                        text("UPDATE users SET password_hash = :hash WHERE user_id = :user_id"),
                        {"hash": new_hash, "user_id": user_id}
                    )
                    conn.commit()
                    print(f"   ✅ Password hashed successfully\n")
                    updated_count += 1
                    
                elif choice == "2":
                    # Set a new password
                    new_password = input(f"   Enter new password for {email}: ").strip()
                    if new_password:
                        new_hash = pwd_context.hash(new_password)
                        conn.execute(
                            text("UPDATE users SET password_hash = :hash WHERE user_id = :user_id"),
                            {"hash": new_hash, "user_id": user_id}
                        )
                        conn.commit()
                        print(f"   ✅ New password set successfully\n")
                        updated_count += 1
                    else:
                        print(f"   ⏭️  Skipped (empty password)\n")
                else:
                    print(f"   ⏭️  Skipped\n")
        
        print(f"\n{'='*50}")
        print(f"✅ Migration complete!")
        print(f"   Updated: {updated_count} users")
        print(f"   Total: {len(users)} users")
        
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
