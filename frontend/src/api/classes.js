// src/api/classes.js
// All calls go through the authenticated axios instance (auto-attaches JWT).
import { api } from "../services/api";

export const classesAPI = {
  // FACULTY: Create class
  async createClass(className, facultyId, joinCode = "") {
    const { data } = await api.post("/faculty/classes", {
      class_name: className,
      faculty_id: facultyId,
      join_code: joinCode,
    });
    return data;
  },

  // FACULTY: Get faculty classes
  async getFacultyClasses(facultyId) {
    const { data } = await api.get(`/faculty/${facultyId}/classes`);
    return data;
  },

  // STUDENT: Get enrolled classes
  async getStudentClasses(studentId) {
    const { data } = await api.get("/student/classes", {
      params: { student_id: studentId },
    });
    return data;
  },

  // STUDENT: Join class
  async joinClass(joinCode, studentId) {
    const { data } = await api.post("/student/classes/join", {
      join_code: joinCode,
      student_id: studentId,
    });
    return data;
  },

  // FACULTY: Start session
  async startSession(classId) {
    const { data } = await api.post(
      `/faculty/classes/${classId}/sessions`
    );
    return data;
  },

  // FACULTY: End session
  async endSession(classId, sessionId) {
    const { data } = await api.put(
      `/faculty/classes/${classId}/sessions/${sessionId}/end`
    );
    return data;
  },

  // FACULTY: Get all students in a class
  async getClassStudents(classId) {
    const { data } = await api.get(
      `/faculty/classes/${classId}/students`
    );
    return data;
  },

  // FACULTY: Get session by ID (code + status)
  async getSessionById(sessionId) {
    const { data } = await api.get(`/faculty/sessions/${sessionId}`);
    return data;
  },

  // Get full attendance list for class (used for live updates)
  async getClassAttendance(classId) {
    const { data } = await api.get(
      `/faculty/classes/${classId}/attendance`
    );
    return data;
  },
};
