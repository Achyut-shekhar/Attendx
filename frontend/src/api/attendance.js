// src/api/attendance.js
// All calls go through the authenticated axios instance (auto-attaches JWT).
import { api } from "../services/api";

export const attendanceApi = {
  // STUDENT: Submit attendance using generated code
  async submitAttendanceCode(studentId, code, location = null) {
    const payload = { student_id: studentId, code };

    // Add location if provided (including accuracy for better verification)
    if (location) {
      payload.latitude = location.latitude;
      payload.longitude = location.longitude;
      // Send accuracy so backend can account for GPS uncertainty
      if (location.accuracy) {
        payload.accuracy = location.accuracy;
      }
    }

    // Note: this endpoint is at /attendance/submit-code (no /api prefix)
    // so we use the base URL directly via a custom axios call
    const { data } = await api.post("/attendance/submit-code", payload, {
      baseURL: (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"),
    });
    return data;
  },

  // FACULTY: Start session
  async startSession(classId) {
    const { data } = await api.post(`/faculty/classes/${classId}/sessions`);
    return data;
  },

  // FACULTY: End session
  async closeSession(classId, sessionId) {
    const { data } = await api.put(
      `/faculty/classes/${classId}/sessions/${sessionId}/end`
    );
    return data;
  },

  // FETCH SESSION by ID
  async getSessionById(sessionId) {
    const { data } = await api.get(`/faculty/sessions/${sessionId}`);
    return data;
  },

  // ✅ CORRECT attendance list endpoint
  async getAttendanceForClass(classId) {
    const { data } = await api.get(`/faculty/classes/${classId}/attendance`);
    return data;
  },

  // ✅ Manual attendance mark
  async markManualAttendance(sessionId, studentId, status = "PRESENT") {
    const { data } = await api.post(`/session/${sessionId}/attendance`, {
      session_id: sessionId,
      student_id: studentId,
      status,
    }, {
      baseURL: (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"),
    });
    return data;
  },

  // ✅ Explicitly mark a student ABSENT for this session (used when unchecking)
  async unmarkAttendance(sessionId, studentId) {
    const { data } = await api.post(`/session/${sessionId}/attendance`, {
      session_id: sessionId,
      student_id: studentId,
      status: "ABSENT",
    }, {
      baseURL: (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"),
    });
    return data;
  },
};
