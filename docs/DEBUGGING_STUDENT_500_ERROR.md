# Debugging: Student Dashboard 500 Error

## Problem

When logging in as student "Aarav Gupta" (user_id: 11), the StudentDashboard fails to load with:

```
GET http://localhost:8000/api/student/classes?student_id=11
Status: 500 (Internal Server Error)
```

## Root Causes & Solutions

### Cause 1: Student Not in Database

**Check if Student 11 exists:**

- Open browser DevTools → Network tab
- Look for the login response
- Verify the returned `user_id` matches the request

**Solution:**
Run this SQL to check:

```sql
SELECT user_id, name, role, email FROM users WHERE user_id = 11;
```

If not found, create the test student with the database_manager script.

### Cause 2: No Class Enrollments

**Expected behavior:**

- If student has NO classes → Empty array `[]` returned (NOT an error)
- Dashboard should show "No classes enrolled yet" message

**This is NOT an error state** - it's completely normal for a new student.

### Cause 3: SQL Query Syntax Error

**Check the database tables exist:**

```sql
-- Check table structure
\d class_enrollments
\d classes
\d users

-- Check if student 11 has any enrollments
SELECT * FROM class_enrollments WHERE student_id = 11;

-- Try the exact query
SELECT
    c.class_id,
    c.class_name,
    c.join_code,
    u.name as faculty_name
FROM class_enrollments ce
JOIN classes c ON ce.class_id = c.class_id
JOIN users u ON c.faculty_id = u.user_id
WHERE ce.student_id = 11
ORDER BY c.class_name;
```

### Cause 4: Database Connection Issue

**Check backend logs:**

- Look at terminal running uvicorn
- Should see: `DEBUG: Fetching classes for student_id=11`
- Check for connection errors

**Solution:**

- Verify PostgreSQL is running
- Check `.env` file has correct credentials
- Restart backend

## Quick Fixes

### Fix 1: Check Backend Logs

1. Look at the terminal running `python -m uvicorn main:app --port 8000`
2. Find the error message after the request
3. Copy the error detail

### Fix 2: Enroll Student in a Class

The student dashboard will work once the student joins a class:

1. Get a class join code:

   ```sql
   SELECT class_id, class_name, join_code FROM classes LIMIT 1;
   ```

2. Use the "Join Class" button in the StudentDashboard
3. Enter the join code
4. The class should appear

### Fix 3: Check Database Directly

Open psql and run:

```sql
-- 1. Check if student exists
SELECT * FROM users WHERE user_id = 11;

-- 2. Check their enrollments
SELECT ce.*, c.class_name
FROM class_enrollments ce
LEFT JOIN classes c ON ce.class_id = c.class_id
WHERE ce.student_id = 11;

-- 3. Check all classes available
SELECT * FROM classes LIMIT 5;

-- 4. Try to enroll manually
INSERT INTO class_enrollments (student_id, class_id, enrolled_at)
VALUES (11, 1, NOW());
```

## Expected Behavior After Fix

✅ **After student joins a class:**

- Dashboard loads
- Class card appears with:
  - Class name
  - Faculty name
  - Attendance rate (0% if no records)
  - Attendance mode button
- Can view details calendar
- Can mark attendance

✅ **If no classes enrolled:**

- Dashboard loads
- Shows message: "No classes enrolled yet"
- Shows: "Join a class to get started!"
- Can still click "Join Class" button

## Troubleshooting Checklist

- [ ] Backend running (`python -m uvicorn main:app --port 8000`)
- [ ] PostgreSQL database running
- [ ] Database connection string in `.env` is correct
- [ ] User 11 exists in database
- [ ] At least one class exists in database
- [ ] Faculty for that class exists
- [ ] Try joining a class using the "Join Class" button
- [ ] Check backend terminal for error messages

## Actual Error Response

To get the real error message, open browser DevTools:

1. Right-click → Inspect → Console tab
2. Look for error with URL `http://localhost:8000/api/student/classes?student_id=11`
3. Click on it to see full error detail
4. Copy the `detail` field from response
5. Share that error message for specific debugging

## Common Errors & Meanings

| Error                                         | Cause                     | Fix                               |
| --------------------------------------------- | ------------------------- | --------------------------------- |
| `relation "class_enrollments" does not exist` | Table not created         | Run `python database_manager.py`  |
| `relation "users" does not exist`             | Tables not created        | Run database migrations           |
| `column "attendance_mode" does not exist`     | Old schema                | Update database                   |
| `No results found` or `[]`                    | Student has no classes    | This is OK! Use "Join Class"      |
| `401 Unauthorized`                            | Invalid token             | Re-login                          |
| `500 Internal Server Error`                   | Database connection issue | Check PostgreSQL, restart backend |

## Next Steps

1. **Immediate:** Check the exact error in the backend terminal
2. **Short-term:** Verify student 11 exists, enroll in a class
3. **Long-term:** Set up automatic test data seeding
