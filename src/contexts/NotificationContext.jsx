import { createContext, useContext, useState, useEffect } from "react";
import { notificationApi } from "@/api/notifications";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load notifications
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationApi.getUnread();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load notifications when user changes
  useEffect(() => {
    loadNotifications();
  }, [user]);

  // Set up periodic refresh
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const value = {
    notifications,
    isLoading,
    markAsRead,
    refresh: loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
