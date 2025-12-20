import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";

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
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // ✅ Restore session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  // ✅ Login function (connects to backend with JWT)
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("✅ Login response:", data);

      if (!res.ok) {
        throw new Error(data.detail || "Invalid credentials");
      }

      // ✅ Create user info structure
      const userInfo = {
        user_id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
      };

      // ✅ Save token and user info locally
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(userInfo));
      setToken(data.access_token);
      setUser(userInfo);

      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.role}`,
      });

      return true; // success
    } catch (error) {
      console.error("❌ Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Logout clears data
  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  // ✅ Context shared across the app
  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    notifications,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
