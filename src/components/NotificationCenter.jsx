import React from "react";
import {
  Bell,
  X,
  Check,
  Clock,
  Users,
  Calendar,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/enhanced-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";

const NotificationCenter = () => {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications();

  const unreadCount = notifications.length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "session_start":
        return <Clock className="h-4 w-4 text-warning" />;
      case "student_joined":
      case "class_joined":
        return <Users className="h-4 w-4 text-primary" />;
      case "attendance_marked":
        return <Check className="h-4 w-4 text-success" />;
      case "attendance_absent":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "session_ended":
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "border-l-destructive";
      case "medium":
        return "border-l-warning";
      case "low":
        return "border-l-muted";
      default:
        return "border-l-muted";
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </SheetTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                disabled={isLoading}
                className="h-8 w-8"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </div>
          </div>
          <SheetDescription>
            Stay updated with your classes and attendance
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-full mt-6">
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.notification_id}
                  className={`cursor-pointer transition-all duration-200 border-l-4 ${getPriorityColor(
                    notification.priority
                  )} shadow-medium hover:shadow-large`}
                  onClick={() => markAsRead(notification.notification_id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getNotificationIcon(notification.type)}
                        <CardTitle className="text-sm font-medium">
                          {notification.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-primary rounded-full" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.notification_id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs mb-2">
                      {notification.message}
                    </CardDescription>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(notification.created_at)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
