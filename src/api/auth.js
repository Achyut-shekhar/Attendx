// src/api/auth.js

// Base API URL (from .env or fallback to localhost)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// 🟢 LOGIN API
async function login(email, password, role) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, role }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Invalid credentials");
    }

    return response.json(); // Should contain access_token + user
  } catch (error) {
    console.error("Login API error:", error);
    throw error;
  }
}

// 🟢 FETCH PROFILE API
async function getProfile() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_URL}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to fetch profile");
  }

  return response.json();
}

// ✅ Export object for AuthContext
export const authApi = {
  login,
  getProfile,
};
