import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { authApi } from "../api/auth";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Function to fetch user profile and notifications
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const userData = await authApi.getProfile();
      if (!userData) return null;

      const userInfo = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      };

      setUser(userInfo);

      if (userData.notifications) {
        setNotifications(userData.notifications);
      }

      return userData;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await fetchUserProfile();
        if (!userData) {
          localStorage.removeItem("token");
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Set up periodic profile refresh (every 5 minutes)
    const refreshInterval = setInterval(fetchUserProfile, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  const login = async (email, password, role) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(email, password, role);
      console.log("Login response:", response); // Debug log

      if (!response || !response.access_token || !response.user) {
        toast({
          title: "Error",
          description: "Invalid server response format",
          variant: "destructive",
        });
        return false;
      }

      // Save token and user data
      localStorage.setItem("token", response.access_token);
      const userInfo = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
      };
      setUser(userInfo);

      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      return true;
    } catch (error) {
      console.error("Login error:", error);
      // Clear any stale auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);

      toast({
        title: "Login Failed",
        description:
          'Please use faculty@school.edu or student@school.edu with password "password"',
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear all auth-related data
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);

    // Notify user
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/mark-read`);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    notifications,
    markNotificationAsRead,
    refreshProfile: fetchUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
