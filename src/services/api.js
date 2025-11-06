import axios from "axios";

// Create axios instance with default config
export const api = axios.create({
  baseURL: "http://localhost:8000", // FastAPI backend URL
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
  createClass: async (name, joinCode) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await api.post("/faculty/classes", {
      class_name: name,
      join_code: joinCode || undefined,
      faculty_id: user?.user_id,
    });
    return response.data;
  },

  getClasses: async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    console.log("🔍 User data from localStorage:", user);

    const faculty_id = user?.user_id;
    console.log("📍 Extracted faculty_id:", faculty_id);

    if (!faculty_id) {
      throw new Error("Faculty ID not found in user data");
    }

    const url = `/faculty/${faculty_id}/classes`;
    console.log("🌐 Making request to:", url);

    const response = await api.get(url);
    console.log("✅ Classes response:", response.data);

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

  getClassStudents: async (classId) => {
    const response = await api.get(`/faculty/classes/${classId}/students`);
    return response.data;
  },

  getClassDetails: async (classId) => {
    const response = await api.get(`/faculty/classes/${classId}`);
    return response.data;
  },

  deleteClass: async (classId) => {
    const response = await api.delete(`/faculty/classes/${classId}`);
    return response.data;
  },
};

// Student API calls
export const studentAPI = {
  joinClass: async (joinCode) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await api.post("/student/classes/join", {
      join_code: joinCode,
      student_id: user?.user_id,
    });
    return response.data;
  },

  getEnrolledClasses: async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await api.get("/student/classes", {
      params: {
        student_id: user?.user_id,
      },
    });
    return response.data;
  },

  markAttendance: async (attendanceData) => {
    // attendanceData can be either an object with session_id and student_id,
    // or just a sessionId for backward compatibility
    let payload;
    if (typeof attendanceData === "object" && attendanceData.session_id) {
      // Faculty marking attendance
      payload = {
        session_id: attendanceData.session_id,
        student_id: attendanceData.student_id,
      };
    } else {
      // Student self-marking attendance
      const user = JSON.parse(localStorage.getItem("user"));
      payload = {
        session_id: attendanceData,
        student_id: user?.user_id,
      };
    }
    const response = await api.post("/student/attendance/mark", payload);
    return response.data;
  },

  getClassDetails: async (classId) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await api.get(`/student/classes/${classId}`, {
      params: {
        student_id: user?.user_id,
      },
    });
    return response.data;
  },

  getAttendanceRecords: async (classId) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const response = await api.get(`/student/classes/${classId}/attendance`, {
      params: {
        student_id: user?.user_id,
      },
    });
    return response.data;
  },
};
