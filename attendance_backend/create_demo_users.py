from database import get_connection
from sqlalchemy import text
from passlib.context import CryptContext

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_demo_users():
    # Demo user credentials
    users = [
        {
            "name": "Demo Faculty",
            "email": "faculty@school.edu",
            "password": "password",
            "role": "FACULTY"
        },
        {
            "name": "Demo Student",
            "email": "student@school.edu",
            "password": "password",
            "role": "STUDENT",
            "roll_number": 12345
        }
    ]
    
    try:
        with get_connection() as conn:
            for user in users:
                # Check if user already exists
                result = conn.execute(
                    text("SELECT email FROM Users WHERE email = :email"),
                    {"email": user["email"]}
                ).fetchone()
                
                if not result:
                    # Hash password
                    hashed_password = pwd_context.hash(user["password"])
                    
                    # Insert user
                    conn.execute(
                        text("""
                            INSERT INTO Users (name, email, password_hash, role, roll_number)
                            VALUES (:name, :email, :password_hash, :role, :roll_number)
                        """),
                        {
                            "name": user["name"],
                            "email": user["email"],
                            "password_hash": hashed_password,
                            "role": user["role"],
                            "roll_number": user.get("roll_number")
                        }
                    )
            conn.commit()
            print("✅ Demo users created successfully!")
    except Exception as e:
        print("❌ Error creating demo users:", e)

if __name__ == "__main__":
    create_demo_users()