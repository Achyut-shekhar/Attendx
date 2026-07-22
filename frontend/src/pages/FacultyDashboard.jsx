import React, { useState, useEffect } from "react";
import { facultyAPI, api } from "@/services/api";
import {
  Plus,
  Users,
  Calendar,
  Play,
  Filter,
  Search,
  Trash2,
  CheckCircle,
  BookOpen,
  Sparkles,
  TrendingUp,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAttendance } from "@/contexts/AttendanceContext";
import { Badge } from "@/components/ui/badge";
import ClassDetails from "@/components/ClassDetails";
import LocationCapture from "@/components/attendance/LocationCapture";

const ClassCard = ({
  classItem,
  status,
  onViewDetails,
  onDelete,
  onEndSession,
  onStartSession,
  onGoToAttendance,
  startingSession,
}) => {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardHeader className="relative pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-semibold truncate">
              {classItem.class_name}
            </CardTitle>
            <CardDescription className="font-mono text-xs sm:text-sm mt-1">
              Code:{" "}
              <span className="text-primary font-semibold">
                {classItem.join_code}
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {status && (
              <Badge
                variant={
                  status === "active"
                    ? "default"
                    : status === "ended"
                      ? "secondary"
                      : "outline"
                }
                className={
                  status === "active"
                    ? "bg-green-600 hover:bg-green-700 text-white text-xs"
                    : "text-xs"
                }
              >
                {status === "ended" ? (
                  <span className="flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
                    Ended
                  </span>
                ) : status === "active" ? (
                  <span className="flex items-center capitalize">
                    <span className="h-1.5 w-1.5 mr-1.5 bg-white rounded-full animate-pulse"></span>
                    Live
                  </span>
                ) : (
                  status
                )}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(classItem)}
              title="Delete Class"
              className="h-8 w-8 opacity-50 hover:opacity-100 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4 pt-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-muted/50">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold">
                {classItem.students_count || 0}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Students
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-muted/50">
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold">
                {classItem.sessions_count || 0}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Sessions
              </p>
            </div>
          </div>
        </div>

        {classItem.last_session && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last: {classItem.last_session}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant={status === "active" ? "default" : "outline"}
            size="sm"
            className={`w-full h-9 sm:h-10 text-xs sm:text-sm ${
              status === "active" ? "shadow-lg" : ""
            }`}
            disabled={startingSession}
            onClick={() => {
              if (status === "active") {
                onGoToAttendance(classItem);
              } else {
                onStartSession(classItem);
              }
            }}
          >
            <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            {startingSession
              ? "Starting..."
              : status === "active"
                ? "Go to Attendance"
                : status === "ended"
                  ? "Start New Session"
                  : "Start Session"}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
              onClick={() => onViewDetails(classItem)}
            >
              View Details
            </Button>
            {status === "active" && (
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => onEndSession(classItem)}
              >
                End Session
              </Button>
            )}
          </div>
        </div>
        {status === "ended" && (
          <div className="text-center text-green-600 font-semibold text-sm mt-2">
            ✓ Session Complete
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FacultyDashboard = () => {
  const { toast } = useToast();
  const {
    sessions,
    updateCounter,
    startSession,
    endSession,
    getSessionStatus,
  } = useAttendance();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState({ name: "", joinCode: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [endedClassIds, setEndedClassIds] = useState([]);
  const [activeSessions, setActiveSessions] = useState({});
  const [startingSession, setStartingSession] = useState(false); // Prevent double-click
  const [creatingClass, setCreatingClass] = useState(false); // Prevent double-click on create
  const [endSessionDialogOpen, setEndSessionDialogOpen] = useState(false);
  const [classToEnd, setClassToEnd] = useState(null);
  const [deleteClassDialogOpen, setDeleteClassDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [classToDelete, setClassToDelete] = useState(null);
  const [deletingClass, setDeletingClass] = useState(false);

  // Reset Password states
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Location-based attendance states
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [classToStart, setClassToStart] = useState(null);
  const [sessionLocation, setSessionLocation] = useState(null);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [diameterInput, setDiameterInput] = useState("200"); // display state: user types diameter

  // Helper: enrich a class with dynamic stats (students count, sessions count, last session time)
  const enrichClassWithStats = async (cls) => {
    try {
      // Number of enrolled students
      const students = await facultyAPI.getClassStudents(cls.class_id);
      const students_count = Array.isArray(students) ? students.length : 0;

      // Authoritative sessions stats from backend
      const stats = await facultyAPI.getClassSessionsStats(cls.class_id);
      const sessions_count = stats?.sessions_count ?? 0;
      const last_session = stats?.last_session
        ? new Date(stats.last_session).toLocaleString()
        : null;

      return { ...cls, students_count, sessions_count, last_session };
    } catch (_e) {
      // On failure, return class with safe defaults
      return {
        ...cls,
        students_count: 0,
        sessions_count: 0,
        last_session: null,
      };
    }
  };

  // Load classes and active sessions
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load classes
        const apiClasses = await facultyAPI.getClasses();
        // Enrich each class with dynamic stats in parallel
        const enriched = await Promise.all(
          (apiClasses || []).map((c) => enrichClassWithStats(c)),
        );
        setClasses(enriched);

        // Load active sessions from backend to sync state
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.user_id) {
          const { data: activeSessionsData } = await api.get(
            "/faculty/sessions/active",
            { params: { faculty_id: user.user_id } },
          );
          const sessionMap = {};
          activeSessionsData.forEach((session) => {
            sessionMap[session.class_id] = {
              status: "active",
              sessionId: session.session_id,
              generatedCode: session.generated_code,
              startTime: session.start_time,
            };
          });
          setActiveSessions(sessionMap);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to load classes",
          variant: "destructive",
        });
        setClasses([]);
      }
    };
    loadData();
  }, [toast]);

  // Merge context sessions with loaded active sessions
  const mergedSessions = { ...activeSessions, ...sessions };

  const handleCreateClass = async () => {
    if (creatingClass) {
      console.log("[FacultyDashboard] Ignoring duplicate create class click");
      return;
    }
    if (!newClass.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a class name.",
        variant: "destructive",
      });
      return;
    }
    try {
      setCreatingClass(true);
      const createdClass = await facultyAPI.createClass(newClass.name);
      // Enrich the newly created class with stats (will likely be zeros initially)
      const enriched = await enrichClassWithStats(createdClass);
      setClasses([...classes, enriched]);
      setNewClass({ name: "", joinCode: "" });
      setIsCreateDialogOpen(false);
      toast({
        title: "Class Created",
        description: `${newClass.name} created successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create class.",
        variant: "destructive",
      });
    } finally {
      setCreatingClass(false);
    }
  };

  // Handler for location capture
  const handleLocationCaptured = (locationData) => {
    setSessionLocation(locationData);
  };

  // Start session with optional location
  const handleStartSession = async (classItem) => {
    if (startingSession) {
      console.log("[FacultyDashboard] Ignoring duplicate start session click");
      return;
    }

    // Open location dialog to let faculty choose
    setClassToStart(classItem);
    setSessionLocation(null);
    setLocationDialogOpen(true);
  };

  // Proceed with session start (with or without location)
  const proceedWithSessionStart = async (useLocation) => {
    if (!classToStart) return;

    try {
      setStartingSession(true);
      console.log(
        `[FacultyDashboard] Starting session for class_id=${classToStart.class_id}`,
      );

      let locationData = null;
      if (useLocation && sessionLocation) {
        locationData = {
          latitude: sessionLocation.latitude,
          longitude: sessionLocation.longitude,
          radius_meters: radiusMeters,
        };
        console.log("[FacultyDashboard] Using location:", locationData);
      }

      const session = await facultyAPI.startSession(
        classToStart.class_id,
        locationData,
      );
      const sessionId = session.session_id;

      console.log(
        `[FacultyDashboard] Session created: session_id=${sessionId}`,
      );

      if (!sessionId) throw new Error("Invalid session response");

      // Update context
      startSession(classToStart.class_id);

      // Close location dialog
      setLocationDialogOpen(false);
      setClassToStart(null);
      setSessionLocation(null);

      // Navigate to attendance page
      navigate(`/attendance/${classToStart.class_id}?sessionId=${sessionId}`);

      toast({
        title: "Session Started",
        description: useLocation
          ? `${classToStart.class_name} session started with location-based attendance (${radiusMeters * 2}m diameter zone).`
          : `${classToStart.class_name} session is active.`,
      });
    } catch (error) {
      console.error("[FacultyDashboard] Error starting session:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start session",
        variant: "destructive",
      });
    } finally {
      setStartingSession(false);
    }
  };

  const handleEndSession = async (classItem) => {
    // Open confirmation dialog
    setClassToEnd(classItem);
    setEndSessionDialogOpen(true);
  };

  const confirmEndSession = async () => {
    if (!classToEnd) return;

    try {
      const activeSession = mergedSessions[classToEnd.class_id];
      if (!activeSession?.sessionId) throw new Error("No active session found");
      await facultyAPI.endSession(classToEnd.class_id, activeSession.sessionId);
      endSession(classToEnd.class_id);
      setEndedClassIds((prev) => [...prev, classToEnd.class_id]);
      toast({
        title: "Session Ended",
        description: `${classToEnd.class_name} session has ended.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to end session",
        variant: "destructive",
      });
    } finally {
      setEndSessionDialogOpen(false);
      setClassToEnd(null);
    }
  };

  // NEW: Handle navigation to active attendance session
  const handleGoToAttendance = async (classItem) => {
    try {
      // Always fetch from backend to ensure we have the latest active session
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const { data } = await api.get(
        `/class/${classItem.class_id}/active-session`,
        { baseURL: API_URL },
      );

      if (data.session_id) {
        // Update context with the active session info
        if (!mergedSessions[classItem.class_id]?.sessionId) {
          const newSessions = {
            ...sessions,
            [classItem.class_id]: {
              status: "active",
              sessionId: data.session_id,
              generatedCode: data.generated_code,
              startTime: data.start_time,
            },
          };
          // Update sessions context (this assumes setSessions is accessible)
          // If not, we can still navigate - the Attendance page will fetch the data
        }

        navigate(
          `/attendance/${classItem.class_id}?sessionId=${data.session_id}`,
        );
      } else {
        throw new Error("No active session found for this class");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to navigate to attendance. Please try starting a new session.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClass = (classItem) => {
    setClassToDelete(classItem);
    setDeleteConfirmationText("");
    setDeleteClassDialogOpen(true);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      setDeletingClass(true);
      await facultyAPI.deleteClass(classToDelete.class_id);
      setClasses((prev) =>
        prev.filter((cls) => cls.class_id !== classToDelete.class_id),
      );
      toast({
        title: "Class Deleted",
        description: `${classToDelete.class_name} has been deleted.`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class",
        variant: "destructive",
      });
    } finally {
      setDeletingClass(false);
      setDeleteClassDialogOpen(false);
      setClassToDelete(null);
    }
  };

  const handleViewDetails = (classItem) => {
    setSelectedClass(classItem);
    setDetailsOpen(true);
  };

  // ---- Reset Password Handlers ----
  const handleOpenResetPassword = async () => {
    setResetPasswordOpen(true);
    setSelectedUser(null);
    setUserSearch("");
    setNewPassword("");
    setConfirmPassword("");
    try {
      const users = await facultyAPI.listAllUsers();
      setAllUsers(users || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setAdminKey("");
    setShowNewPwd(false);
    setShowConfirmPwd(false);
  };

  const handleAdminResetPassword = async () => {
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (!adminKey) {
      toast({ title: "Validation Error", description: "Admin reset key is required.", variant: "destructive" });
      return;
    }
    try {
      setResettingPassword(true);
      await facultyAPI.adminResetPassword(selectedUser.user_id, newPassword, adminKey);
      toast({
        title: "Password Reset",
        description: `Password for ${selectedUser.name} has been reset successfully.`,
      });
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
      setAdminKey("");
    } catch (err) {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredClasses = classes.filter((cls) =>
    cls.class_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeClasses = filteredClasses.filter(
    (cls) =>
      mergedSessions[cls.class_id]?.status === "active" &&
      !endedClassIds.includes(cls.class_id),
  );
  const endedClasses = filteredClasses.filter(
    (cls) =>
      mergedSessions[cls.class_id]?.status === "ended" ||
      endedClassIds.includes(cls.class_id),
  );
  const scheduledClasses = filteredClasses.filter(
    (cls) =>
      (!mergedSessions[cls.class_id] ||
        (mergedSessions[cls.class_id]?.status !== "active" &&
          mergedSessions[cls.class_id]?.status !== "ended")) &&
      !endedClassIds.includes(cls.class_id),
  );

  return (
    <div className="min-h-screen bg-background" key={updateCounter}>
      <Header />

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                Faculty Dashboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground ml-11 sm:ml-12">
              Manage your classes and attendance sessions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base rounded-xl border-orange-500/40 text-orange-600 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/60 transition-all"
              onClick={handleOpenResetPassword}
            >
              <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Reset Password</span>
            </Button>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="hero"
                className="flex items-center gap-2 w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Create Class</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  Create New Class
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Add a new class to your dashboard
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="className" className="text-sm font-medium">
                    Class Name
                  </Label>
                  <Input
                    id="className"
                    placeholder="e.g., Computer Science 101"
                    value={newClass.name}
                    onChange={(e) =>
                      setNewClass({ ...newClass, name: e.target.value })
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joinCode" className="text-sm font-medium">
                    Join Code (Optional)
                  </Label>
                  <Input
                    id="joinCode"
                    placeholder="Leave empty to auto-generate"
                    value={newClass.joinCode}
                    onChange={(e) =>
                      setNewClass({ ...newClass, joinCode: e.target.value })
                    }
                    className="h-11"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="h-10 sm:h-11"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleCreateClass}
                  disabled={creatingClass}
                  className="h-10 sm:h-11"
                >
                  {creatingClass ? "Creating..." : "Create Class"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-card/50 border-border/50 focus:border-primary"
            />
          </div>
          <Button
            variant="outline"
            className="flex items-center justify-center gap-2 h-10 sm:h-11 w-full sm:w-auto"
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {classes.length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Total Classes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-green-500/10">
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {activeClasses.length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Active Now
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/10">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {classes.reduce(
                      (sum, c) => sum + (c.students_count || 0),
                      0,
                    )}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Total Students
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-orange-500/10">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {classes.reduce(
                      (sum, c) => sum + (c.sessions_count || 0),
                      0,
                    )}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Total Sessions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Sessions */}
        {activeClasses.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <h2 className="text-lg sm:text-xl font-semibold">
                Active Sessions
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {activeClasses.map((classItem) => (
                <ClassCard
                  key={classItem.class_id}
                  classItem={classItem}
                  status="active"
                  onViewDetails={handleViewDetails}
                  onDelete={handleDeleteClass}
                  onEndSession={handleEndSession}
                  onStartSession={handleStartSession}
                  onGoToAttendance={handleGoToAttendance}
                  startingSession={startingSession}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ended Sessions */}
        {endedClasses.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-semibold">
                Ended Sessions
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {endedClasses.map((classItem) => (
                <ClassCard
                  key={classItem.class_id}
                  classItem={classItem}
                  status="ended"
                  onViewDetails={handleViewDetails}
                  onDelete={handleDeleteClass}
                  onEndSession={handleEndSession}
                  onStartSession={handleStartSession}
                  onGoToAttendance={handleGoToAttendance}
                  startingSession={startingSession}
                />
              ))}
            </div>
          </div>
        )}

        {/* Your Classes */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-semibold">Your Classes</h2>
          </div>
          {scheduledClasses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {scheduledClasses.map((classItem) => (
                <ClassCard
                  key={classItem.class_id}
                  classItem={classItem}
                  status={
                    mergedSessions[classItem.class_id]?.status ||
                    getSessionStatus(classItem.class_id)
                  }
                  onViewDetails={handleViewDetails}
                  onDelete={handleDeleteClass}
                  onEndSession={handleEndSession}
                  onStartSession={handleStartSession}
                  onGoToAttendance={handleGoToAttendance}
                  startingSession={startingSession}
                />
              ))}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium mb-2">No classes yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first class to get started
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {filteredClasses.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No classes found</p>
            <p className="text-muted-foreground">
              Your search for "{searchTerm}" did not match any classes.
            </p>
          </div>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-6xl h-[90vh] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <DialogTitle className="text-lg sm:text-xl">
              {selectedClass ? selectedClass.class_name : "Class Details"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              View attendance records and session details for this class
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto h-[calc(90vh-5rem)] px-2 sm:px-4">
            {selectedClass && <ClassDetails classItem={selectedClass} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* End Session Confirmation Dialog */}
      <AlertDialog
        open={endSessionDialogOpen}
        onOpenChange={setEndSessionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Attendance Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end the attendance session for{" "}
              <strong>{classToEnd?.class_name}</strong>? This action will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Mark all unmarked students as absent</li>
                <li>Close the session permanently</li>
              </ul>
              You will still be able to view the attendance records, but no
              further attendance can be marked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEndSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Class Confirmation Dialog */}
      <AlertDialog
        open={deleteClassDialogOpen}
        onOpenChange={(open) => {
          setDeleteClassDialogOpen(open);
          if (!open) {
            setDeleteConfirmationText("");
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Class?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                Are you sure you want to permanently delete <strong>{classToDelete?.class_name}</strong>?
                This action is <strong className="text-destructive">irreversible</strong> and will permanently delete all related attendance sessions, students' records, and classes' statistics.
              </span>
              <div className="pt-2 space-y-1.5">
                <Label htmlFor="delete-confirm-input" className="text-xs font-semibold text-foreground/80">
                  Please type <strong className="text-destructive select-all">delete</strong> to confirm:
                </Label>
                <Input
                  id="delete-confirm-input"
                  placeholder='Type "delete" here'
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="h-10 border-destructive/20 focus-visible:ring-destructive/30"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingClass}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteClass}
              disabled={deletingClass || deleteConfirmationText !== "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingClass ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Location Capture Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-h-[90vh] max-w-lg gap-0 p-0 sm:w-[480px]">
          <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
            <DialogHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle>Start Attendance Session</DialogTitle>
              <DialogDescription>
                Choose how to track attendance for{" "}
                <strong>{classToStart?.class_name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-6">
              <div className="space-y-4 pb-4">
                {/* GPS Tips Banner */}
                <div className="flex gap-2.5 rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <span className="text-lg leading-none shrink-0">📡</span>
                  <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-semibold">For accurate location capture:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
                      <li>Turn <strong>Wi-Fi ON</strong> (no need to connect to any network)</li>
                      <li>Turn <strong>Battery Saver OFF</strong> for full GPS performance</li>
                    </ul>
                  </div>
                </div>

                <h3 className="font-medium">Location-Based Attendance</h3>
                <p className="text-sm text-muted-foreground">
                  Enable location verification to ensure students are physically
                  present in the classroom.
                </p>

                <div className="max-h-[360px] overflow-y-auto pr-1 sm:max-h-none">
                  <LocationCapture
                    onLocationCaptured={handleLocationCaptured}
                  />
                </div>

                {sessionLocation && (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                    <Label htmlFor="diameter">Allowed Zone Diameter (meters)</Label>
                    <p className="text-xs text-muted-foreground -mt-1">
                      The total area students must be within. Diameter = 2 × radius sent to backend.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[50, 100, 200, 500, 1000].map((diamPreset) => (
                        <Button
                          key={diamPreset}
                          type="button"
                          size="sm"
                          variant={radiusMeters === diamPreset / 2 ? "default" : "outline"}
                          onClick={() => {
                            setRadiusMeters(diamPreset / 2);
                            setDiameterInput(String(diamPreset));
                          }}
                          className="min-w-[54px]"
                        >
                          {diamPreset}m
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Custom:
                      </span>
                      <Input
                        id="diameter"
                        type="number"
                        min="10"
                        max="20000"
                        step="10"
                        value={diameterInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setDiameterInput(raw); // allow free typing
                          const val = parseInt(raw, 10);
                          if (!isNaN(val) && val >= 10 && val <= 20000) {
                            setRadiusMeters(Math.max(5, Math.round(val / 2)));
                          }
                        }}
                        onBlur={(e) => {
                          // On blur, snap to a clean value
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 10) {
                            const clamped = Math.min(20000, Math.max(10, val));
                            const radius = Math.max(5, Math.round(clamped / 2));
                            setRadiusMeters(radius);
                            setDiameterInput(String(radius * 2));
                          } else {
                            // Reset to current radius if invalid
                            setDiameterInput(String(radiusMeters * 2));
                          }
                        }}
                        className="w-28"
                      />
                      <span className="text-xs text-muted-foreground">
                        meters diameter
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Students must be within <strong>{radiusMeters}m</strong> of your location
                      (zone diameter: <strong>{radiusMeters * 2}m</strong>).
                      GPS accuracy (±
                      {sessionLocation.accuracy
                        ? Math.round(sessionLocation.accuracy)
                        : "?"}
                      m) is automatically accounted for.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => proceedWithSessionStart(false)}
                disabled={startingSession}
              >
                Start Without Location
              </Button>
              <Button
                variant="default"
                className="w-full sm:w-auto"
                onClick={() => proceedWithSessionStart(true)}
                disabled={!sessionLocation || startingSession}
              >
                {startingSession ? "Starting..." : "Start with Location"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <p className="text-center text-xs text-muted-foreground py-6">
        &copy; 2026 Achyut Shekhar Singh. All Rights Reserved.
      </p>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordOpen}
        onOpenChange={(open) => {
          setResetPasswordOpen(open);
          if (!open) { setSelectedUser(null); setUserSearch(""); }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-hidden p-0">
          <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10">
                  <KeyRound className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Reset User Password</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Search for a student or faculty and set a new password.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Search */}
              {!selectedUser && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email…"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>

                  {/* User List */}
                  <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                    {allUsers
                      .filter((u) =>
                        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((u) => (
                        <button
                          key={u.user_id}
                          onClick={() => handleSelectUser(u)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-card/60 hover:bg-muted/60 hover:border-primary/40 transition-all text-left group"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[10px] font-semibold ${
                              u.role === "FACULTY"
                                ? "border-blue-500/50 text-blue-500 bg-blue-500/10"
                                : "border-green-500/50 text-green-600 bg-green-500/10"
                            }`}
                          >
                            {u.role === "FACULTY" ? "Faculty" : "Student"}
                          </Badge>
                        </button>
                      ))}
                    {allUsers.filter((u) =>
                      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-6">No users found.</p>
                    )}
                  </div>
                </>
              )}

              {/* Password Form — shown after selecting a user */}
              {selectedUser && (
                <div className="space-y-4">
                  {/* Selected user banner */}
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/5">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{selectedUser.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          selectedUser.role === "FACULTY"
                            ? "border-blue-500/50 text-blue-500 bg-blue-500/10"
                            : "border-green-500/50 text-green-600 bg-green-500/10"
                        }`}
                      >
                        {selectedUser.role === "FACULTY" ? "Faculty" : "Student"}
                      </Badge>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-new-pwd" className="text-sm font-medium">New Password</Label>
                    <div className="relative">
                      <Input
                        id="reset-new-pwd"
                        type={showNewPwd ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-confirm-pwd" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="reset-confirm-pwd"
                        type={showConfirmPwd ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`h-10 pr-10 ${
                          confirmPassword && confirmPassword !== newPassword
                            ? "border-destructive focus-visible:ring-destructive"
                            : confirmPassword && confirmPassword === newPassword
                              ? "border-green-500 focus-visible:ring-green-500"
                              : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-destructive">Passwords do not match.</p>
                    )}
                    {confirmPassword && confirmPassword === newPassword && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Passwords match
                      </p>
                    )}
                  </div>

                  {/* Admin Reset Key */}
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <Label htmlFor="admin-key" className="text-sm font-medium text-orange-600">Admin Reset Key</Label>
                    <Input
                      id="admin-key"
                      type="password"
                      placeholder="Enter secret authorization key. To get password contact developer "
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      className="h-10 border-orange-500/30 focus-visible:ring-orange-500/50"
                    />
                    <p className="text-[10px] text-muted-foreground">Required to authorize this password reset.</p>
                  </div>

                  <Button
                    className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white mt-4"
                    onClick={handleAdminResetPassword}
                    disabled={resettingPassword || !newPassword || !confirmPassword || !adminKey}
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    {resettingPassword ? "Resetting…" : "Reset Password"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacultyDashboard;