"""
Simple password reset - direct database update
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import bcrypt

load_dotenv()

DB_URL = os.getenv("DB_URL")
print("=== Quick Password Reset ===\n")

try:
    engine = create_engine(DB_URL, pool_pre_ping=True)
    
    # Set new password for user 55
    email = "achyutshekhar54@gmail.com"
    new_password = "achyut@2024"
    
    # Hash with bcrypt directly
    password_bytes = new_password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    hashed_str = hashed.decode('utf-8')
    
    print(f"Resetting password for: {email}")
    print(f"New password: {new_password}")
    
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE users SET password_hash = :hash WHERE email = :email"),
            {"hash": hashed_str, "email": email}
        )
        conn.commit()
        
        print(f"\n✅ Password updated successfully!")
        print(f"\nYou can now login with:")
        print(f"   Email: {email}")
        print(f"   Password: {new_password}")

except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
