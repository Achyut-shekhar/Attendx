import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children, role }) => {
  const { user, isLoading } = useAuth();

  // 🔹 While auth is loading (e.g., fetching profile)
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg font-semibold text-gray-600">Loading...</p>
      </div>
    );
  }

  // 🔹 If not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🔹 If a role is specified and user role doesn’t match → redirect to login
  if (role && user.role !== role) {
    return <Navigate to="/login" replace />;
  }

  // ✅ If all checks pass, render the protected page
  return children;
};

export default ProtectedRoute;
