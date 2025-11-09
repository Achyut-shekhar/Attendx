# Real-Time Notifications Implementation

## Overview

Implemented real-time notification creation for all key attendance events. Notifications are now automatically created when:

- Faculty starts an attendance session
- Faculty ends an attendance session
- Students submit attendance codes
- Faculty manually marks attendance

## Changes Made

### 1. Backend - Fixed `create_notification` Helper Function

**File**: `attendance_backend/main.py` (lines 1157-1182)

**Issue**: The function was trying to insert into columns that don't exist in the actual database table.

**Solution**: Updated to work with existing table schema:

```python
def create_notification(
    user_id: int,
    type: str,
    title: str,
    message: str,
    priority: str = "medium",
    related_class_id: Optional[int] = None,
    related_session_id: Optional[int] = None
):
    """Helper function to create notifications - works with existing table schema"""
    try:
        with engine.connect() as conn:
            # Use only columns that exist in the actual notifications table
            sql = text(
                """
                INSERT INTO notifications
                (user_id, type, message, is_read, created_at)
                VALUES (:uid, :type, :message, FALSE, CURRENT_TIMESTAMP)
                """
            )
            conn.execute(sql, {
                "uid": user_id,
                "type": type,
                "message": message
            })
            conn.commit()
            print(f"[NOTIFICATION] Created notification for user_id={user_id}, type={type}")
    except Exception as e:
        print(f"[NOTIFICATION] Failed to create notification: {str(e)}")
```

**Database Schema**: Only uses existing columns:

- `user_id`
- `type`
- `message`
- `is_read`
- `created_at`

### 2. Backend - Added Notifications to Session Start

**File**: `attendance_backend/main.py` (lines 391-405)

**Already implemented** - Creates notifications for all enrolled students when a session starts:

```python
# Create notifications for all enrolled students
for student in students:
    create_notification(
        user_id=student[0],
        type="session_start",
        title="New Attendance Session",
        message=f"{class_name} attendance session is now active. Code: {code}",
        priority="high",
        related_class_id=class_id,
        related_session_id=result['session_id']
    )
```

### 3. Backend - Added Notifications to Session End

**File**: `attendance_backend/main.py` (lines 487-526)

**Already implemented** - Creates notifications for:

- All students with their attendance status
- Faculty member with session summary

```python
for student in students:
    student_id, status = student[0], student[1]
    if status == 'PRESENT' or status == 'LATE':
        create_notification(
            user_id=student_id,
            type="attendance_marked",
            title="Attendance Recorded",
            message=f"Your attendance has been marked as {status} for {class_name}",
            priority="low",
            related_class_id=class_id,
            related_session_id=session_id
        )
    else:  # ABSENT
        create_notification(
            user_id=student_id,
            type="attendance_absent",
            title="Marked Absent",
            message=f"You were marked absent for {class_name}",
            priority="medium",
            related_class_id=class_id,
            related_session_id=session_id
        )

# Send summary notification to faculty
create_notification(
    user_id=faculty_row[0],
    type="session_ended",
    title="Session Ended",
    message=f"{class_name} attendance session ended. {stats[0]}/{stats[3]} students present.",
    priority="medium",
    related_class_id=class_id,
    related_session_id=session_id
)
```

### 4. Backend - Added Notifications to Code Submission

**File**: `attendance_backend/main.py` (lines 854-920)

**Newly added** - Creates notification when student submits attendance code:

```python
# Get class name and create notification
class_sql = text("SELECT class_name FROM classes WHERE class_id = :cid")
class_info = conn.execute(class_sql, {"cid": class_id}).fetchone()
if class_info:
    class_name = class_info[0]
    create_notification(
        user_id=payload.student_id,
        type="attendance_marked",
        title="Attendance Confirmed",
        message=f"Your attendance has been recorded as PRESENT for {class_name}",
        priority="low"
    )
```

### 5. Backend - Added Notifications to Manual Attendance

**File**: `attendance_backend/main.py` (lines 912-989)

**Newly added** - Creates notification when faculty manually marks attendance:

```python
# Get class info for notification
class_sql = text(
    """
    SELECT c.class_name, c.class_id
    FROM classes c
    JOIN attendance_sessions s ON c.class_id = s.class_id
    WHERE s.session_id = :sid
    """
)
class_info = conn.execute(class_sql, {"sid": session_id}).fetchone()

if class_info:
    class_name = class_info[0]
    # Send notification to student
    create_notification(
        user_id=payload.student_id,
        type="attendance_marked",
        title="Attendance Updated",
        message=f"Your attendance has been manually marked as {status} for {class_name}",
        priority="medium"
    )
```

### 6. Frontend - Added Refresh Button

**File**: `src/components/NotificationCenter.jsx`

**Changes**:

1. Added `RefreshCw` icon import
2. Added `refresh` from `useNotifications()` hook
3. Added refresh button with loading animation

```jsx
<Button
  variant="ghost"
  size="icon"
  onClick={refresh}
  disabled={isLoading}
  className="h-8 w-8"
>
  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
</Button>
```

## Notification Types

| Type                | When Created                                   | Who Receives          | Priority   |
| ------------------- | ---------------------------------------------- | --------------------- | ---------- |
| `session_start`     | Faculty starts session                         | All enrolled students | High       |
| `session_ended`     | Faculty ends session                           | Faculty member        | Medium     |
| `attendance_marked` | Student submits code OR faculty marks manually | Student               | Low/Medium |
| `attendance_absent` | Session ends with student absent               | Student               | Medium     |

## Testing

### How to Test:

1. **Start the backend server**:

   ```bash
   cd attendance_backend
   python -m uvicorn main:app --reload
   ```

2. **Start the frontend**:

   ```bash
   npm run dev
   ```

3. **Test Session Start Notifications**:

   - Login as faculty
   - Start an attendance session for a class
   - Login as a student enrolled in that class
   - Check notifications (should see "New Attendance Session")

4. **Test Code Submission Notifications**:

   - Login as student
   - Submit attendance code
   - Refresh notifications
   - Should see "Attendance Confirmed" notification

5. **Test Manual Attendance Notifications**:

   - Login as faculty
   - Manually mark a student's attendance
   - Login as that student
   - Refresh notifications
   - Should see "Attendance Updated" notification

6. **Test Session End Notifications**:
   - Login as faculty
   - End an attendance session
   - Check faculty notifications (should see session summary)
   - Login as students
   - Check notifications (should see attendance status)

### Manual Refresh

Users can click the **refresh button** (rotating arrow icon) in the notification panel to manually fetch the latest notifications. The icon will spin while loading.

## Database Schema Note

The current notifications table schema is:

```sql
CREATE TABLE notifications (
    -- id column (primary key)
    user_id INTEGER,
    type VARCHAR,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

The `create_notification` helper function accepts additional parameters (`title`, `priority`, `related_class_id`, `related_session_id`) for future compatibility, but currently only stores to the existing columns.

## Auto-Refresh

Auto-refresh is **disabled** per user request. Notifications only load:

- On component mount (when user first opens the app)
- When user clicks the refresh button
- When user changes (login/logout)

## Next Steps (Optional Enhancements)

1. **Add WebSocket Support**: For true real-time push notifications without manual refresh
2. **Add Sound Notifications**: Play a sound when new notifications arrive
3. **Add Browser Notifications**: Use Web Notifications API for desktop alerts
4. **Add Notification Preferences**: Let users customize which notifications they receive
5. **Add Notification History**: Show all notifications, not just unread ones
6. **Expand Database Schema**: Add the missing columns (title, priority, related_class_id, related_session_id) for richer notification metadata
