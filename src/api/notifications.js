// src/api/notifications.js
import { api } from "../services/api";

export const notificationApi = {
  async getAll(userId, unreadOnly = false) {
    try {
      console.log(
        `[NotificationAPI] Fetching notifications for user ${userId}, unreadOnly=${unreadOnly}`
      );
      const response = await api.get(
        `/notifications/${userId}?unread_only=${unreadOnly}`
      );
      console.log(
        `[NotificationAPI] Got ${response.data?.length || 0} notifications`
      );
      return response.data;
    } catch (error) {
      console.error(
        "[NotificationAPI] getAll error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  async getUnreadCount(userId) {
    try {
      const response = await api.get(`/notifications/${userId}/unread-count`);
      console.log(
        `[NotificationAPI] Unread count for user ${userId}:`,
        response.data
      );
      return response.data;
    } catch (error) {
      console.error(
        "[NotificationAPI] getUnreadCount error:",
        error.response?.data || error.message
      );
      throw error;
    }
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
