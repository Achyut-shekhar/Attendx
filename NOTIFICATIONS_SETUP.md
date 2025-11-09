# Notification System Setup

## Database Setup

Run the following SQL to create the notifications table:

```sql
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium',
    related_class_id INTEGER,
    related_session_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (related_session_id) REFERENCES attendance_sessions(session_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
```

Or simply run:

```bash
psql -U your_username -d your_database -f attendance_backend/create_notifications_table.sql
```

## Notification Types

The system automatically creates notifications for:

### For Students:

- **session_start** (High Priority): When a new attendance session begins

  - Title: "New Attendance Session"
  - Message: "{Class Name} attendance session is now active. Code: {CODE}"

- **attendance_marked** (Low Priority): When attendance is marked as PRESENT/LATE

  - Title: "Attendance Recorded"
  - Message: "Your attendance has been marked as {STATUS} for {Class Name}"

- **attendance_absent** (Medium Priority): When marked as ABSENT

  - Title: "Marked Absent"
  - Message: "You were marked absent for {Class Name}"

- **class_joined** (Low Priority): When successfully joining a class
  - Title: "Joined Class"
  - Message: "You have successfully joined {Class Name}"

### For Faculty:

- **session_ended** (Medium Priority): When a session is closed

  - Title: "Session Ended"
  - Message: "{Class Name} attendance session ended. {X}/{Total} students present."

- **student_joined** (Low Priority): When a student joins their class
  - Title: "New Student"
  - Message: "{Student Name} has joined your {Class Name} class"

## API Endpoints

### GET `/api/notifications/unread?user_id={id}`

Get all unread notifications for a user

### GET `/api/notifications?user_id={id}`

Get all notifications (up to 50 most recent)

### PATCH `/api/notifications/{notification_id}/mark-read`

Mark a specific notification as read

### PATCH `/api/notifications/mark-all-read?user_id={id}`

Mark all notifications as read for a user

### DELETE `/api/notifications/{notification_id}`

Delete a notification

## Features

✅ **Real-time Updates**: Notifications refresh every 30 seconds
✅ **Auto-Generated**: Created automatically on key events (session start/end, attendance marking, class enrollment)
✅ **Priority System**: High/Medium/Low priority with visual indicators
✅ **Read/Unread Tracking**: Track which notifications have been seen
✅ **Timestamp Formatting**: Human-readable timestamps (e.g., "2 minutes ago")
✅ **Delete Support**: Users can dismiss individual notifications
✅ **Badge Counter**: Shows unread count on notification bell icon

## Usage

The notification system is already integrated into the application. Once the database table is created, notifications will automatically appear for:

1. Students when a session starts
2. Students when their attendance is marked
3. Students when they join a class
4. Faculty when a session ends
5. Faculty when students join their class

No additional configuration needed!
