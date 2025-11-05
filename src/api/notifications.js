// src/api/notifications.js
import api from "../services/api";

export const notificationApi = {
  async getUnread() {
    const response = await api.get("/notifications/unread");
    return response.data;
  },

  async markAsRead(notificationId) {
    const response = await api.patch(
      `/notifications/${notificationId}/mark-read`
    );
    return response.data;
  },

  async getAll() {
    const response = await api.get("/notifications");
    return response.data;
  },
};
