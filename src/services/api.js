import axios from "axios";

// Create axios instance with default config
export const api = axios.create({
  baseURL: "", // Remove /api since we'll add it in the interceptor
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add /api prefix to all requests
    config.url = `/api${config.url}`;
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid auth state
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Redirect to login if needed
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Faculty API calls
export const facultyAPI = {
  createClass: async (name) => {
    const response = await api.post("/faculty/classes", {
      class_name: name,
    });
    return response.data;
  },

  getClasses: async () => {
    const response = await api.get("/api/faculty/classes");
    return response.data;
  },

  startSession: async (classId) => {
    const response = await api.post(`/faculty/classes/${classId}/sessions`);
    return response.data;
  },

  endSession: async (classId, sessionId) => {
    const response = await api.put(
      `/faculty/classes/${classId}/sessions/${sessionId}/end`
    );
    return response.data;
  },

  getSessionAttendance: async (classId) => {
    const response = await api.get(`/faculty/classes/${classId}`);
    return response.data;
  },
};

// Student API calls
export const studentAPI = {
  joinClass: async (joinCode) => {
    const response = await api.post("/api/student/classes/join", {
      join_code: joinCode,
    });
    return response.data;
  },

  getEnrolledClasses: async () => {
    const response = await api.get("/api/student/classes");
    return response.data;
  },
  markAttendance: async (classId, code) => {
    const response = await api.post("/student/attendance/mark", {
      classId,
      code,
    });
    return response.data;
  },
};
