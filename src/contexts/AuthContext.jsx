import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    } else {
      // Clear any incomplete state
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      // const response = await fetch("http://localhost:3001/api/auth/login",
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, 
 {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Clear any stale data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        throw new Error(data.message || "Failed to login");
      }

      if (!data.token) {
        throw new Error("No token received from server");
      }

      // Save token and user data
      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
        })
      );

      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      });

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

  const value = {
    user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
