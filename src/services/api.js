// src/services/api.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Load logged-in user safely
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

// Axios instance for all /api routes
export const api = axios.create({
  baseURL: API_BASE + "/api",
  withCredentials: false,
});

/* -----------------------------------------------------------
   FACULTY API
------------------------------------------------------------ */
export const facultyAPI = {
  /* ------------------ Classes ------------------ */
  async getClasses() {
    const user = getUser();
    if (!user?.user_id) throw new Error("Not logged in as faculty");
    const { data } = await api.get(`/faculty/${user.user_id}/classes`);
    return data;
  },

  async createClass(class_name, join_code = "") {
    const user = getUser();
    if (!user?.user_id) throw new Error("Not logged in as faculty");

    const payload = {
      class_name,
      join_code,
      faculty_id: user.user_id,
    };

    const { data } = await api.post(`/faculty/classes`, payload);
    return data;
  },

  async deleteClass(class_id) {
    const { data } = await api.delete(`/faculty/classes/${class_id}`);
    return data;
  },

  /* ------------------ Sessions ------------------ */
  async startSession(class_id, locationData = null) {
    const payload = { class_id };

    // Add location data if provided
    if (locationData) {
      payload.latitude = locationData.latitude;
      payload.longitude = locationData.longitude;
      payload.radius_meters = locationData.radius_meters || 50;
    }

    const { data } = await api.post(
      `/faculty/classes/${class_id}/sessions`,
      payload
    );
    return data;
  },

  async endSession(class_id, session_id) {
    const { data } = await api.put(
      `/faculty/classes/${class_id}/sessions/${session_id}/end`
    );
    return data;
  },

  async getSessionById(session_id) {
    const { data } = await api.get(`/faculty/sessions/${session_id}`);
    return data;
  },

  /* ------------------ NEW — Sessions By Date ------------------ */
  async getSessionsByDate(class_id, date) {
    const { data } = await api.get(
      `/faculty/classes/${class_id}/sessions/by-date`,
      { params: { date } }
    );
    return data;
  },

  /* ------------------ NEW — Session Attendance (Flat) ------------------ */
  async getSessionAttendanceFlat(session_id) {
    const { data } = await api.get(
      `/faculty/sessions/${session_id}/attendance/flat`
    );
    return data;
  },

  /* ------------------ Students ------------------ */
  async getClassStudents(class_id) {
    const { data } = await api.get(`/faculty/classes/${class_id}/students`);
    return data;
  },

  /* ------------------ Class Dialog Header ------------------ */
  async getClassHeaderDetails(class_id) {
    const { data } = await api.get(`/faculty/classes/${class_id}/details`);
    return data;
  },

  /* ------------------ Attendance ------------------ */
  async getClassAttendance(class_id) {
    const { data } = await api.get(`/faculty/classes/${class_id}/attendance`);
    return data;
  },

  // Authoritative sessions stats (count + last session start)
  async getClassSessionsStats(class_id) {
    const { data } = await api.get(
      `/faculty/classes/${class_id}/sessions/stats`
    );
    return data;
  },

  // Get all sessions with attendance data for export (optimized)
  async getAllSessionsWithAttendance(class_id) {
    const { data } = await api.get(
      `/faculty/classes/${class_id}/sessions/all-with-attendance`
    );
    return data;
  },

  // ✅ Date-level — used ONLY for calendar view
  async getClassAttendanceByDate(class_id, date) {
    const { data } = await api.get(
      `/faculty/classes/${class_id}/attendance/by-date`,
      { params: { date } }
    );
    return data;
  },
};

/* -----------------------------------------------------------
   STUDENT API
------------------------------------------------------------ */
export const studentAPI = {
  async getEnrolledClasses() {
    const user = getUser();
    if (!user?.user_id) throw new Error("Not logged in as student");

    const { data } = await api.get(`/student/classes`, {
      params: { student_id: user.user_id },
    });
    return data;
  },

  async joinClass(join_code, roll_number) {
    const user = getUser();
    if (!user?.user_id) throw new Error("Not logged in as student");

    const { data } = await api.post(`/student/classes/join`, {
      join_code,
      student_id: user.user_id,
      roll_number,
    });
    return data;
  },

  async getClassDetails(class_id) {
    const user = getUser();
    if (!user?.user_id) throw new Error("Not logged in as student");

    const { data } = await api.get(`/student/classes/${class_id}`, {
      params: { student_id: user.user_id },
    });
    return data;
  },

  async getAttendanceRecords(class_id) {
    const user = getUser();
    if (!user?.user_id) throw new Error("Not logged in as student");

    const { data } = await api.get(`/student/classes/${class_id}/attendance`, {
      params: { student_id: user.user_id },
    });
    return data;
  },
};
