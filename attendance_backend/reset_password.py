import asyncio
import getpass
import sys
import io

# Force UTF-8 output on Windows (fixes emoji in cp1252 terminals)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

from sqlalchemy import text
from src.core.database import engine
from src.core.security import get_password_hash

async def get_user_by_email(conn, email: str):
    """Fetch user details by email."""
    query = text("SELECT user_id, name, email, role FROM users WHERE email = :email")
    result = await conn.execute(query, {"email": email})
    return result.mappings().first()

async def list_all_users(conn):
    """List all registered users."""
    query = text("SELECT name, email, role FROM users ORDER BY role, name")
    result = await conn.execute(query)
    return result.mappings().all()

async def main():
    print("=" * 60)
    print("🔑 ATTENDX PASSWORD RESET UTILITY 🔑".center(60))
    print("=" * 60)
    
    async with engine.connect() as conn:
        # Prompt for email
        email = input("Enter user email address (or press Enter to list all users): ").strip()
        
        if not email:
            print("\nFetching registered users...")
            users = await list_all_users(conn)
            if not users:
                print("❌ No users found in the database.")
                return
            
            print("\nRegistered Users:")
            print(f"{'Name':<25} | {'Email':<30} | {'Role':<10}")
            print("-" * 70)
            for u in users:
                print(f"{u['name']:<25} | {u['email']:<30} | {u['role']:<10}")
            print("-" * 70)
            
            email = input("\nEnter the email address of the user to reset: ").strip()
            if not email:
                print("❌ No email provided. Exiting.")
                return
        
        # Verify user exists
        user = await get_user_by_email(conn, email)
        if not user:
            print(f"❌ User with email '{email}' not found.")
            return
        
        print(f"\nFound User: {user['name']} ({user['role']})")
        
        # Prompt for new password
        while True:
            password = getpass.getpass("Enter new password (min 6 characters): ").strip()
            if not password:
                print("❌ Password cannot be empty.")
                continue
            if len(password) < 6:
                print("❌ Password must be at least 6 characters long.")
                continue
            
            confirm_password = getpass.getpass("Confirm new password: ").strip()
            if password != confirm_password:
                print("❌ Passwords do not match. Please try again.")
                continue
            break
        
        # Hash and update
        print("\nHashing password and updating database...")
        hashed_password = get_password_hash(password)
        
        # Use a transaction to update
        async with engine.begin() as trans_conn:
            update_query = text(
                "UPDATE users SET password_hash = :password_hash WHERE email = :email"
            )
            await trans_conn.execute(
                update_query, 
                {"password_hash": hashed_password, "email": email}
            )
        
        print(f"✅ Success! Password for {user['name']} ({email}) has been reset.")
        print("=" * 60)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n❌ Operation cancelled by user.")
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
