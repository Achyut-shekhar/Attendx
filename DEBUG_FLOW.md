# Debug Flow: Login to Get Classes

## Flow Trace

### 1️⃣ **Frontend: Login (Login.jsx → AuthContext.jsx)**

**Before:** (❌ WRONG)

```jsx
// AuthContext.jsx line 47-51
const userInfo = {
  id: data.user_id, // ← Using 'id'
  name: data.name,
  email: email,
  role: data.role,
};
```

**After:** (✅ CORRECT)

```jsx
// AuthContext.jsx line 47-51
const userInfo = {
  user_id: data.user_id, // ← Now using 'user_id'
  name: data.name,
  email: email,
  role: data.role,
};
```

**Result in localStorage:**

```json
{
  "user_id": 1,
  "name": "Dr. Arjun Mehta",
  "email": "arjun.mehta@college.edu",
  "role": "FACULTY"
}
```

### 2️⃣ **Frontend: Get Classes (api.js → facultyAPI.getClasses)**

**Flow:**

```javascript
getClasses: async () => {
  // 1. Get user from localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  console.log("🔍 User data:", user);
  // Logs: { user_id: 1, name: "Dr. Arjun Mehta", ... }

  // 2. Extract faculty_id
  const faculty_id = user?.user_id; // ✅ Now correctly gets 1
  console.log("📍 Extracted faculty_id:", faculty_id);

  // 3. Make API call
  const response = await api.get(`/faculty/${faculty_id}/classes`);
  // Calls: GET http://localhost:8000/api/faculty/1/classes
};
```

### 3️⃣ **Frontend: API Interceptor (api.js)**

```javascript
// Request interceptor adds /api prefix
config.url = `/api${config.url}`; // /faculty/1/classes becomes /api/faculty/1/classes

// Final request:
// GET http://localhost:8000/api/faculty/1/classes
```

### 4️⃣ **Backend: Receive Request (main.py)**

```python
@app.get("/api/faculty/{faculty_id}/classes")
def get_faculty_classes(faculty_id: int):
    print(f"🔍 Backend received request for faculty_id: {faculty_id}")
    # Logs: 🔍 Backend received request for faculty_id: 1

    # Query database
    sql = text("""
        SELECT class_id, class_name, section, join_code
        FROM classes
        WHERE faculty_id = :faculty_id
        ORDER BY class_name
    """)

    # Execute query
    rows = conn.execute(sql, {"faculty_id": 1})
    # Logs: 📊 Query returned 5 classes: [...]

    return results  # Return classes
```

### 5️⃣ **Backend: Database Query**

```sql
SELECT class_id, class_name, section, join_code
FROM classes
WHERE faculty_id = 1
ORDER BY class_name;
```

**Expected Result:**

```
class_id | class_name | section | join_code
---------|------------|---------|----------
1        | Data Structures | A | DSA12345
2        | Database Systems | A | DBMS67890
... (more classes)
```

## Checklist to Verify

### ✅ Frontend

- [x] AuthContext stores `user_id` (not `id`)
- [x] api.js reads `user?.user_id`
- [x] Console logs show correct faculty_id

### ✅ Backend

- [x] Endpoint `/api/faculty/{faculty_id}/classes` exists
- [x] Database has classes with matching faculty_id
- [x] Console logs show received faculty_id and query results

### ✅ Database

- [x] Tables exist (users, classes)
- [x] Sample data loaded
- [x] Faculty user_id = 1 exists
- [x] Classes with faculty_id = 1 exist

## Testing Steps

1. **Clear browser localStorage:**

   ```javascript
   localStorage.clear();
   ```

2. **Restart frontend:**

   ```bash
   npm run dev
   ```

3. **Restart backend (if changed):**

   ```bash
   python -m uvicorn main:app --reload
   ```

4. **Login with faculty account:**

   - Email: `arjun.mehta@college.edu`
   - Password: `password`

5. **Open browser console and check logs:**

   - Should see: `🔍 User data: { user_id: 1, ... }`
   - Should see: `📍 Extracted faculty_id: 1`
   - Should see: `✅ Classes response: [...]`

6. **Check backend terminal:**
   - Should see: `🔍 Backend received request for faculty_id: 1`
   - Should see: `📊 Query returned X classes: [...]`

## Common Issues & Fixes

| Issue                               | Cause                                        | Fix                                      |
| ----------------------------------- | -------------------------------------------- | ---------------------------------------- |
| "Faculty ID not found in user data" | AuthContext stores `id` instead of `user_id` | ✅ FIXED - Updated AuthContext           |
| 405 Method Not Allowed              | Wrong endpoint path                          | ✅ FIXED - Using `/faculty/{id}/classes` |
| Empty classes array                 | No classes in database for faculty           | Create class first or check DB           |
| 500 Internal Server Error           | Database connection issue                    | Check .env DB_URL and credentials        |
