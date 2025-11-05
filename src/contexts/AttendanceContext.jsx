import { createContext, useState, useContext, useEffect } from "react";
import { api } from "../services/api";

const AttendanceContext = createContext();

export const useAttendance = () => useContext(AttendanceContext);

export const AttendanceProvider = ({ children }) => {
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);

  // Load active sessions from database on mount
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        // Check if user is authenticated
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await api.get("/faculty/sessions/active");
        const activeSessions = response.data.reduce((acc, session) => {
          acc[session.class_id] = {
            status: "active",
            sessionId: session.session_id,
            generatedCode: session.generated_code,
            startTime: session.start_time,
          };
          return acc;
        }, {});
        setSessions(activeSessions);
      } catch (error) {
        console.error(
          "Failed to load active sessions:",
          error.response?.data || error.message
        );
        // If unauthorized, clear token
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
        }
      } finally {
        setLoading(false);
      }
    };
    loadActiveSessions();
  }, []);

  const startSession = async (classId, method = "manual") => {
    try {
      // First, create session in database
      const response = await api.post(`/faculty/classes/${classId}/sessions`);
      const sessionData = response.data.session;

      // Then update local state
      const newSessions = {
        ...sessions,
        [classId]: {
          status: "active",
          method,
          timestamp: Date.now(),
          sessionId: sessionData.session_id,
          generatedCode: sessionData.generated_code,
        },
      };
      setSessions(newSessions);
      saveToLocalStorage(newSessions);

      console.log("Session created in database:", sessionData); // Debug log
      return sessionData;
    } catch (error) {
      console.error("Failed to start session:", error);
      throw error; // Propagate error to component
    }
  };

  const endSession = async (classId) => {
    try {
      const currentSession = sessions[classId];
      if (currentSession?.sessionId) {
        // Update session in database
        await api.patch(
          `/faculty/classes/${classId}/sessions/${currentSession.sessionId}/end`
        );
      }

      // Update local state
      const newSessions = {
        ...sessions,
        [classId]: { status: "ended", timestamp: Date.now() },
      };
      setSessions(newSessions);
      saveToLocalStorage(newSessions);
    } catch (error) {
      console.error("Failed to end session:", error);
      throw error;
    }
  };

  const getSessionStatus = (classId) => {
    return sessions[classId]?.status;
  };

  const value = {
    sessions,
    startSession,
    endSession,
    getSessionStatus,
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};
