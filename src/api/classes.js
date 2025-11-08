// src/api/classes.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const classesAPI = {
  // FACULTY: Create class
  async createClass(className, facultyId, joinCode = "") {
    const response = await fetch(`${API_URL}/api/faculty/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_name: className,
        faculty_id: facultyId,
        join_code: joinCode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create class");
    }
    return response.json();
  },

  // FACULTY: Get faculty classes
  async getFacultyClasses(facultyId) {
    const response = await fetch(`${API_URL}/api/faculty/${facultyId}/classes`);
    if (!response.ok) throw new Error("Failed to load faculty classes");
    return response.json();
  },

  // STUDENT: Get enrolled classes
  async getStudentClasses(studentId) {
    const response = await fetch(
      `${API_URL}/api/student/classes?student_id=${studentId}`
    );
    if (!response.ok) throw new Error("Failed to load student classes");
    return response.json();
  },

  // STUDENT: Join class
  async joinClass(joinCode, studentId) {
    const response = await fetch(`${API_URL}/api/student/classes/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ join_code: joinCode, student_id: studentId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Invalid join code");
    }

    return response.json();
  },

  // FACULTY: Start session
  async startSession(classId) {
    const response = await fetch(
      `${API_URL}/api/faculty/classes/${classId}/sessions`,
      { method: "POST" }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to start session");
    }

    return response.json();
  },

  // FACULTY: End session
  async endSession(classId, sessionId) {
    const response = await fetch(
      `${API_URL}/api/faculty/classes/${classId}/sessions/${sessionId}/end`,
      { method: "PUT" }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to end session");
    }

    return response.json();
  },

  // FACULTY: Get all students in a class
  async getClassStudents(classId) {
    const response = await fetch(
      `${API_URL}/api/faculty/classes/${classId}/students`
    );
    if (!response.ok) throw new Error("Failed to load class students");
    return response.json();
  },

  // FACULTY: Get session by ID (code + status)
  async getSessionById(sessionId) {
    const response = await fetch(`${API_URL}/api/faculty/sessions/${sessionId}`);
    if (!response.ok) throw new Error("Failed to load session");
    return response.json();
  },

  // ✅ NEW: Get full attendance list for class (used for live updates)
  async getClassAttendance(classId) {
    const response = await fetch(
      `${API_URL}/api/faculty/classes/${classId}/attendance`
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to load attendance");
    }

    return data;
  },
};
