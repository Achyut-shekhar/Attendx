from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import text
from src.core.database import engine
from src.core.security import verify_password, get_password_hash, create_access_token, create_reset_token, create_reset_token_expiry, verify_token
from src.core.email import send_password_reset_email
from src.core.config import FACULTY_REGISTER_KEY
from src.models.schemas import LoginRequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest, DeleteAccountRequest

router = APIRouter(tags=["auth"])

@router.post("/login")
async def login(request: LoginRequest):
    """Login with email and password, returns JWT token"""
    try:
        # Truncate password to 72 bytes (bcrypt limit) to avoid errors
        password = request.password
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        
        async with engine.connect() as conn:
            q = text(
                "SELECT user_id, name, email, password_hash, role FROM users WHERE email = :email"
            )
            result = await conn.execute(q, {"email": request.email})
            row = result.fetchone()
            
            if not row:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            user = dict(row._mapping)
            
            # Verify password - support both plain text (old) and bcrypt (new)
            password_valid = False
            if user["password_hash"].startswith("$2b$"):
                # Bcrypt hash
                password_valid = verify_password(password, user["password_hash"])
            else:
                # Plain text (legacy - for backward compatibility)
                password_valid = (password == user["password_hash"])
            
            if not password_valid:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Create JWT token
            access_token = create_access_token(
                data={"sub": user["user_id"], "role": user["role"], "email": user["email"]}
            )
            
            return {
                "message": "Login successful",
                "access_token": access_token,
                "token_type": "bearer",
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[LOGIN] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register")
async def register(request: RegisterRequest):
    """Register a new user (student or faculty). Requires a valid registration key."""
    try:
        print(f"[REGISTER] Attempting to register: {request.email}, role={request.role}")
        
        # Validate role
        if request.role not in ["STUDENT", "FACULTY"]:
            raise HTTPException(status_code=400, detail="Role must be STUDENT or FACULTY")
        
        # Validate registration key (faculty only — students register freely)
        if request.role == "FACULTY":
            if not request.register_key or request.register_key != FACULTY_REGISTER_KEY:
                print(f"[REGISTER] Invalid registration key for FACULTY")
                raise HTTPException(status_code=403, detail="Invalid registration key. Contact your administrator to get the correct key.")
        
        # Validate password length
        if len(request.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        # Truncate password to 72 bytes (bcrypt limit)
        password = request.password
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        
        async with engine.begin() as conn:
            # Check if email already exists
            check_sql = text("SELECT user_id FROM users WHERE email = :email")
            existing = await conn.execute(check_sql, {"email": request.email})
            if existing.fetchone():
                print(f"[REGISTER] Email already exists: {request.email}")
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # Hash the password
            hashed_password = get_password_hash(password)
            
            # Insert new user
            insert_sql = text(
                """
                INSERT INTO users (name, email, password_hash, role)
                VALUES (:name, :email, :password, :role)
                RETURNING user_id, name, email, role
                """
            )
            result = await conn.execute(
                insert_sql,
                {
                    "name": request.name,
                    "email": request.email,
                    "password": hashed_password,
                    "role": request.role
                }
            )
            
            user = dict(result.fetchone()._mapping)
            print(f"[REGISTER] Successfully registered user_id={user['user_id']}")
            
            return {
                "message": "Registration successful",
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[REGISTER] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    try:
        async with engine.begin() as conn:
            # Check if user exists
            user_sql = text("SELECT user_id, name, email FROM users WHERE email = :email")
            result = await conn.execute(user_sql, {"email": request.email})
            user_row = result.fetchone()
            
            if not user_row:
                # Don't reveal if email exists or not (security best practice)
                return {
                    "message": "If the email exists, a reset link has been sent",
                    "success": True
                }
            
            user = dict(user_row._mapping)
            
            # Generate reset token
            token = create_reset_token()
            expires_at = create_reset_token_expiry()
            
            # Delete any existing tokens for this user
            delete_sql = text("DELETE FROM password_reset_tokens WHERE user_id = :user_id")
            await conn.execute(delete_sql, {"user_id": user["user_id"]})
            
            # Store new token
            insert_sql = text("""
                INSERT INTO password_reset_tokens (user_id, token, expires_at)
                VALUES (:user_id, :token, :expires_at)
            """)
            await conn.execute(insert_sql, {
                "user_id": user["user_id"],
                "token": token,
                "expires_at": expires_at
            })
        
        # Send email
        email_sent = await send_password_reset_email(
            email=user["email"],
            token=token,
            name=user["name"],
            frontend_url=request.frontend_url
        )
        
        if not email_sent:
            print(f"⚠️  Failed to send reset email to {user['email']}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send reset email. Please check SMTP configuration on the server."
            )
        
        return {
            "message": "If the email exists, a reset link has been sent",
            "success": True
        }
    
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        import traceback
        print(f"[FORGOT_PASSWORD] ERROR: {str(e)}")
        print(f"[FORGOT_PASSWORD] TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to process request: {str(e)}")


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    try:
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 6 characters long"
            )
        
        async with engine.begin() as conn:
            # Find valid token
            token_sql = text("""
                SELECT prt.user_id, prt.expires_at, prt.used, u.email, u.name
                FROM password_reset_tokens prt
                JOIN users u ON u.user_id = prt.user_id
                WHERE prt.token = :token
            """)
            result = await conn.execute(token_sql, {"token": request.token})
            token_row = result.fetchone()
            
            if not token_row:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid or expired reset token"
                )
            
            token_data = dict(token_row._mapping)
            
            # Check if token is used
            if token_data["used"]:
                raise HTTPException(
                    status_code=400,
                    detail="This reset link has already been used"
                )
            
            # Check if token is expired
            if datetime.utcnow() > token_data["expires_at"]:
                raise HTTPException(
                    status_code=400,
                    detail="This reset link has expired"
                )
            
            # Hash new password
            new_password_hash = get_password_hash(request.new_password)
            
            # Update password
            update_sql = text("""
                UPDATE users 
                SET password_hash = :password_hash
                WHERE user_id = :user_id
            """)
            await conn.execute(update_sql, {
                "password_hash": new_password_hash,
                "user_id": token_data["user_id"]
            })
            
            # Mark token as used
            mark_used_sql = text("""
                UPDATE password_reset_tokens
                SET used = TRUE
                WHERE token = :token
            """)
            await conn.execute(mark_used_sql, {"token": request.token})
            
            print(f"✅ Password reset successful for user_id={token_data['user_id']}")
        
        return {
            "message": "Password reset successful",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[RESET_PASSWORD] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset password")


@router.delete("/delete-account")
async def delete_account(request: DeleteAccountRequest):
    """Delete a user account and all associated data after password verification"""
    try:
        async with engine.begin() as conn:
            # 1. Fetch user to verify password
            user_sql = text(
                "SELECT user_id, name, email, password_hash, role FROM users WHERE user_id = :user_id"
            )
            result = await conn.execute(user_sql, {"user_id": request.user_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="User not found")

            user = dict(row._mapping)

            # 2. Verify password
            password_valid = False
            if user["password_hash"].startswith("$2b$"):
                password_valid = verify_password(request.password, user["password_hash"])
            else:
                password_valid = (request.password == user["password_hash"])

            if not password_valid:
                raise HTTPException(status_code=401, detail="Incorrect password")

            # 3. Delete all related data (cascade)
            user_id = user["user_id"]
            role = user["role"]

            # Delete password reset tokens
            await conn.execute(
                text("DELETE FROM password_reset_tokens WHERE user_id = :user_id"),
                {"user_id": user_id}
            )

            if role == "FACULTY":
                # For faculty: delete attendance records for their sessions, then sessions, then classes
                # Get all class IDs owned by this faculty
                class_ids_result = await conn.execute(
                    text("SELECT class_id FROM classes WHERE faculty_id = :user_id"),
                    {"user_id": user_id}
                )
                class_ids = [r[0] for r in class_ids_result.fetchall()]

                if class_ids:
                    # Delete attendance records for sessions in these classes
                    await conn.execute(
                        text("""
                            DELETE FROM attendance_records 
                            WHERE session_id IN (
                                SELECT session_id FROM attendance_sessions 
                                WHERE class_id = ANY(:class_ids)
                            )
                        """),
                        {"class_ids": class_ids}
                    )

                    # Delete attendance sessions for these classes
                    await conn.execute(
                        text("DELETE FROM attendance_sessions WHERE class_id = ANY(:class_ids)"),
                        {"class_ids": class_ids}
                    )

                    # Delete class enrollments for these classes
                    await conn.execute(
                        text("DELETE FROM class_enrollments WHERE class_id = ANY(:class_ids)"),
                        {"class_ids": class_ids}
                    )

                    # Delete the classes themselves
                    await conn.execute(
                        text("DELETE FROM classes WHERE faculty_id = :user_id"),
                        {"user_id": user_id}
                    )

            elif role == "STUDENT":
                # For students: delete their attendance records and class enrollments
                await conn.execute(
                    text("DELETE FROM attendance_records WHERE student_id = :user_id"),
                    {"user_id": user_id}
                )
                await conn.execute(
                    text("DELETE FROM class_enrollments WHERE student_id = :user_id"),
                    {"user_id": user_id}
                )

            # 4. Finally, delete the user
            await conn.execute(
                text("DELETE FROM users WHERE user_id = :user_id"),
                {"user_id": user_id}
            )

            print(f"✅ Account deleted successfully for user_id={user_id} ({user['email']})")

            return {
                "message": "Account deleted successfully",
                "success": True
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DELETE_ACCOUNT] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")

