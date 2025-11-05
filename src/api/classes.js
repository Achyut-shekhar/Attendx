// api/classes.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const classesApi = {
  async createClass(className, token) {
    const response = await fetch(`${API_URL}/api/faculty/classes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ class_name: className }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create class");
    }

    return response.json();
  },

  async getClasses(token, role) {
    const endpoint =
      role === "FACULTY" ? "/api/faculty/classes" : "/api/student/classes";
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch classes");
    }

    return response.json();
  },

  async joinClass(joinCode, token) {
    const response = await fetch(`${API_URL}/api/student/classes/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ join_code: joinCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to join class");
    }

    return response.json();
  },
};
