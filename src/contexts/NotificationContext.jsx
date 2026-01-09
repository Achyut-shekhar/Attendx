import { createContext, useContext, useState, useEffect } from "react";
import { notificationApi } from "@/api/notifications";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load unread notifications
  const loadNotifications = async () => {
    if (!user?.user_id) return;
    try {
      setIsLoading(true);
      const data = await notificationApi.getAll(user.user_id, true); // unread only
      setNotifications(data);
      setUnreadCount(data.length);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    if (!user?.user_id) return;
    try {
      const data = await notificationApi.getUnreadCount(user.user_id);
      setUnreadCount(data.count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  // Load notifications when user changes
  useEffect(() => {
    loadNotifications();
  }, [user?.user_id]);

  // Periodic refresh - polls for new notifications every 30 seconds
  useEffect(() => {
    if (!user?.user_id) return;
    
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [user?.user_id]);

  const markAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user?.user_id) return;
    try {
      await notificationApi.markAllAsRead(user.user_id);
      setNotifications([]);
      setUnreadCount(0);
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationApi.deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const value = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
