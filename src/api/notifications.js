// src/api/notifications.js
import { api } from "../services/api";

export const notificationApi = {
  async getAll(userId, unreadOnly = false) {
    const response = await api.get(
      `/notifications/${userId}?unread_only=${unreadOnly}`
    );
    return response.data;
  },

  async getUnreadCount(userId) {
    const response = await api.get(`/notifications/${userId}/unread-count`);
    return response.data;
  },

  async markAsRead(notificationId) {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead(userId) {
    const response = await api.put(`/notifications/${userId}/mark-all-read`);
    return response.data;
  },

  async deleteNotification(notificationId) {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};
