# notification_queries.py
from sqlalchemy import text
from database import get_connection
from typing import List, Dict, Optional

def create_notification(user_id: int, notification_type: str, message: str) -> Dict:
    """Create a new notification"""
    sql = text("""
        INSERT INTO Notifications (user_id, type, message)
        VALUES (:user_id, :type, :message)
        RETURNING notification_id, type, message, created_at
    """)
    with get_connection() as conn:
        try:
            result = conn.execute(sql, {
                "user_id": user_id,
                "type": notification_type,
                "message": message
            })
            conn.commit()
            row = result.fetchone()
            return dict(row._mapping) if row else None
        except Exception as e:
            conn.rollback()
            raise e

def mark_notification_read(notification_id: int, user_id: int) -> bool:
    """Mark a notification as read"""
    sql = text("""
        UPDATE Notifications
        SET is_read = true
        WHERE notification_id = :notification_id AND user_id = :user_id
        RETURNING notification_id
    """)
    with get_connection() as conn:
        try:
            result = conn.execute(sql, {
                "notification_id": notification_id,
                "user_id": user_id
            })
            conn.commit()
            return bool(result.fetchone())
        except Exception as e:
            conn.rollback()
            raise e

def get_user_notifications(user_id: int, unread_only: bool = True) -> List[Dict]:
    """Get notifications for a user"""
    sql = text("""
        SELECT notification_id, type, message, created_at, is_read
        FROM Notifications
        WHERE user_id = :user_id
        AND (:unread_only = false OR is_read = false)
        ORDER BY created_at DESC
    """)
    with get_connection() as conn:
        rows = conn.execute(sql, {
            "user_id": user_id,
            "unread_only": unread_only
        })
        return [dict(r._mapping) for r in rows]