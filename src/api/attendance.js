// src/api/attendance.js

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const attendanceApi = {
  // STUDENT: Submit attendance using generated code
  async submitAttendanceCode(studentId, code) {
    const res = await fetch(`${API_URL}/attendance/submit-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to submit attendance");
    return data;
  },

  // FACULTY: Start session
  async startSession(classId) {
    const res = await fetch(`${API_URL}/api/faculty/classes/${classId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to start session");
    return data;
  },

  // FACULTY: End session
  async closeSession(classId, sessionId) {
    const res = await fetch(
      `${API_URL}/api/faculty/classes/${classId}/sessions/${sessionId}/end`,
      { method: "PUT", headers: { "Content-Type": "application/json" } }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to close session");
    return data;
  },

  // FETCH SESSION by ID
  async getSessionById(sessionId) {
    const res = await fetch(`${API_URL}/api/faculty/sessions/${sessionId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch session");
    return data;
  },

  // ✅ CORRECT attendance list endpoint
  async getAttendanceForClass(classId) {
    const res = await fetch(`${API_URL}/api/faculty/classes/${classId}/attendance`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch attendance");
    return data;
  },

  // ✅ NEW: Manual attendance mark
  async markManualAttendance(sessionId, studentId) {
    const res = await fetch(
      `${API_URL}/api/faculty/sessions/${sessionId}/attendance/manual`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, student_id: studentId }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed manual mark");
    return data;
  },
};
