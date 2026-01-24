"""
Quick script to check user passwords and reset them if needed
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

load_dotenv()

DB_URL = os.getenv("DB_URL")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("=== User Password Checker ===\n")

try:
    engine = create_engine(DB_URL, pool_pre_ping=True)
    
    with engine.connect() as conn:
        # Get all users
        result = conn.execute(text("""
            SELECT user_id, name, email, password_hash, role 
            FROM users 
            ORDER BY user_id
        """))
        users = result.fetchall()
        
        print(f"Found {len(users)} users:\n")
        
        for user in users:
            user_id, name, email, password_hash, role = user
            is_hashed = password_hash.startswith("$2b$") if password_hash else False
            
            status = "✅ Bcrypt" if is_hashed else "❌ Plain text"
            print(f"{user_id}. {name} ({email}) - {role}")
            print(f"   Password: {status}")
            if not is_hashed and password_hash:
                print(f"   Current: '{password_hash}'")
            print()
        
        # Ask if user wants to fix passwords
        print("\n" + "="*50)
        print("Would you like to fix/reset any passwords?")
        fix = input("Enter user ID to fix (or 'all' for all plain text, or 'n' to exit): ").strip().lower()
        
        if fix == 'n':
            print("Exiting...")
            exit(0)
        elif fix == 'all':
            # Fix all plain text passwords
            for user in users:
                user_id, name, email, password_hash, role = user
                if not password_hash.startswith("$2b$"):
                    print(f"\nFixing {email}...")
                    print(f"Current plain text password: '{password_hash}'")
                    
                    # Hash the existing password
                    new_hash = pwd_context.hash(password_hash)
                    conn.execute(
                        text("UPDATE users SET password_hash = :hash WHERE user_id = :user_id"),
                        {"hash": new_hash, "user_id": user_id}
                    )
                    conn.commit()
                    print(f"✅ Hashed successfully! You can now login with password: '{password_hash}'")
            
            print("\n✅ All passwords fixed!")
        else:
            # Fix specific user
            try:
                user_id = int(fix)
                user = next((u for u in users if u[0] == user_id), None)
                
                if not user:
                    print(f"❌ User ID {user_id} not found")
                    exit(1)
                
                _, name, email, old_hash, role = user
                
                print(f"\nResetting password for: {name} ({email})")
                new_password = input("Enter new password: ").strip()
                
                if not new_password:
                    print("❌ Password cannot be empty")
                    exit(1)
                
                if len(new_password) < 6:
                    print("❌ Password must be at least 6 characters")
                    exit(1)
                
                if len(new_password.encode('utf-8')) > 72:
                    print("❌ Password is too long (max 72 bytes)")
                    exit(1)
                
                # Hash and update
                new_hash = pwd_context.hash(new_password)
                conn.execute(
                    text("UPDATE users SET password_hash = :hash WHERE user_id = :user_id"),
                    {"hash": new_hash, "user_id": user_id}
                )
                conn.commit()
                
                print(f"\n✅ Password updated successfully!")
                print(f"   Email: {email}")
                print(f"   Password: {new_password}")
                print(f"\nYou can now login with these credentials.")
                
            except ValueError:
                print("❌ Invalid user ID")
                exit(1)

except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
