// api/attendance.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const attendanceApi = {
  async startSession(classId, token) {
    const response = await fetch(`${API_URL}/attendance/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ class_id: classId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to start attendance session");
    }

    return response.json();
  },

  async markAttendance(sessionId, code, token) {
    const response = await fetch(`${API_URL}/attendance/mark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ session_id: sessionId, code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to mark attendance");
    }

    return response.json();
  },

  async closeSession(sessionId, token) {
    const response = await fetch(`${API_URL}/attendance/${sessionId}/close`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to close session");
    }

    return response.json();
  },

  async getAttendanceReport(classId, token) {
    const response = await fetch(`${API_URL}/attendance/report/${classId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch attendance report");
    }

    return response.json();
  },
};
