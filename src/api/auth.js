import { api } from "../services/api";

export const authApi = {
  async login(email, password, role) {
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
        role,
      });

      console.log("Raw server response:", response.data);

      // The backend returns { access_token, token_type, user: {...} }
      const { access_token, token_type, user } = response.data;

      if (!access_token || !user) {
        throw new Error("Invalid response format from server");
      }

      // Return the response in the exact format the backend sends
      return {
        access_token,
        token_type,
        user,
      };
    } catch (error) {
      // Log the error details for debugging
      console.error("Login error details:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  async register(userData) {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      console.error(
        "Registration error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  async getProfile() {
    try {
      const response = await api.get("/users/me");
      return response.data;
    } catch (error) {
      console.error(
        "Get profile error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  async logout() {
    try {
      const response = await api.post("/auth/logout");
      localStorage.removeItem("token");
      return response.data;
    } catch (error) {
      console.error("Logout error:", error.response?.data || error.message);
      throw error;
    }
  },
};
