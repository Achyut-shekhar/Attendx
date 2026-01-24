from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from src.core.database import engine

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("/{user_id}")
async def get_notifications(user_id: int, unread_only: bool = False):
    """Get all notifications for a user, optionally filtered to unread only"""
    try:
        async with engine.connect() as conn:
            if unread_only:
                sql = text(
                    """
                    SELECT *
                    FROM notifications
                    WHERE user_id = :uid AND is_read = FALSE
                    ORDER BY created_at DESC
                    """
                )
            else:
                sql = text(
                    """
                    SELECT *
                    FROM notifications
                    WHERE user_id = :uid
                    ORDER BY created_at DESC
                    LIMIT 50
                    """
                )
            
            result = await conn.execute(sql, {"uid": user_id})
            rows = result.fetchall()
            
            data = []
            for row in rows:
                notification = dict(row._mapping)
                # Ensure backward compatibility - add missing fields if they don't exist
                if 'notification_id' not in notification:
                    notification['notification_id'] = notification.get('id')
                if 'title' not in notification:
                    notification['title'] = notification.get('type', '').replace('_', ' ').title()
                if 'message' not in notification:
                    notification['message'] = notification.get('content', '')
                if 'priority' not in notification:
                    notification['priority'] = 'medium'
                if 'related_class_id' not in notification:
                    notification['related_class_id'] = None
                if 'related_session_id' not in notification:
                    notification['related_session_id'] = None
                if 'class_name' not in notification:
                    notification['class_name'] = None
                if 'section' not in notification:
                    notification['section'] = None
                data.append(notification)
            return data
    except Exception as e:
        print(f"[NOTIFICATIONS] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/unread-count")
async def get_unread_count(user_id: int):
    """Get count of unread notifications"""
    try:
        async with engine.connect() as conn:
            sql = text(
                """
                SELECT COUNT(*) as count
                FROM notifications
                WHERE user_id = :uid AND is_read = FALSE
                """
            )
            result = await conn.execute(sql, {"uid": user_id})
            row = result.fetchone()
            return {"count": row.count if row else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    """Mark a notification as read"""
    try:
        async with engine.begin() as conn:  # Use begin() for auto-commit
            sql = text(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE notification_id = :nid
                """
            )
            await conn.execute(sql, {"nid": notification_id})
            # conn.commit() is automatic with begin()
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}/mark-all-read")
async def mark_all_read(user_id: int):
    """Mark all notifications as read for a user"""
    try:
        async with engine.begin() as conn:
            sql = text(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE user_id = :uid AND is_read = FALSE
                """
            )
            await conn.execute(sql, {"uid": user_id})
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{notification_id}")
async def delete_notification(notification_id: int):
    """Delete a notification"""
    try:
        async with engine.begin() as conn:
            sql = text(
                """
                DELETE FROM notifications
                WHERE notification_id = :nid
                """
            )
            await conn.execute(sql, {"nid": notification_id})
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
