import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { notificationApi } from "@/api/notifications";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const prevCountRef = useRef(0);

  // Load unread notifications
  const loadNotifications = useCallback(
    async (showToastForNew = false) => {
      if (!user?.user_id) {
        console.log("[Notifications] No user, skipping load");
        return;
      }

      try {
        setIsLoading(true);
        console.log("[Notifications] Loading for user:", user.user_id);
        const data = await notificationApi.getAll(user.user_id, true); // unread only
        console.log(
          "[Notifications] Loaded:",
          data?.length || 0,
          "notifications"
        );

        // Show toast for genuinely new notifications
        if (
          showToastForNew &&
          data.length > prevCountRef.current &&
          prevCountRef.current > 0
        ) {
          const newCount = data.length - prevCountRef.current;
          const latestNotification = data[0]; // Most recent notification
          toast({
            title: latestNotification?.title || "New Notification",
            description:
              latestNotification?.message ||
              `You have ${newCount} new notification${newCount > 1 ? "s" : ""}`,
            duration: 5000,
          });
        }

        prevCountRef.current = data.length;
        setNotifications(data || []);
        setUnreadCount(data?.length || 0);
      } catch (error) {
        console.error("[Notifications] Failed to load:", error);
        // Don't clear notifications on error, keep existing ones
      } finally {
        setIsLoading(false);
      }
    },
    [user?.user_id, toast]
  );

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
    if (user?.user_id) {
      console.log(
        "[Notifications] User changed, loading notifications for:",
        user.user_id
      );
      prevCountRef.current = 0; // Reset on user change
      loadNotifications();
    } else {
      console.log("[Notifications] No user, clearing notifications");
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.user_id, loadNotifications]);

  // Periodic refresh - only updates when there are new notifications
  useEffect(() => {
    if (!user?.user_id) return;

    console.log(
      "[Notifications] Starting polling interval (20s) for user:",
      user.user_id
    );

    const interval = setInterval(async () => {
      // Use a functional update style check or ref if needed, 
      // but simple fetch is okay with longer interval
      try {
        const data = await notificationApi.getUnreadCount(user.user_id);
        const newCount = data?.count || 0;
        
        // We Use a ref or local closure to check against current state 
        // to avoid dependency issues
        setUnreadCount(currentCount => {
          if (newCount !== currentCount) {
            // Fetch full list if count changed
            loadNotifications(newCount > currentCount);
          }
          return newCount;
        });
      } catch (error) {
        console.error("[Notifications] Polling error:", error);
      }
    }, 20000); // Check every 20 seconds instead of 5

    return () => {
      console.log("[Notifications] Clearing polling interval");
      clearInterval(interval);
    };
  }, [user?.user_id, loadNotifications]);

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
