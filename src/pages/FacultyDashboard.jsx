import React, { useState, useEffect } from "react";
import { facultyAPI } from "@/services/api";
import {
  Plus,
  Users,
  Calendar,
  Play,
  Filter,
  Search,
  Trash2,
  CheckCircle,
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAttendance } from "@/contexts/AttendanceContext";
import { Badge } from "@/components/ui/badge";
import ClassDetails from "@/components/ClassDetails";

const ClassCard = ({
  classItem,
  status,
  onViewDetails,
  onDelete,
  onEndSession,
  onStartSession,
  onGoToAttendance,
}) => {
  return (
    <Card className="shadow-medium hover:shadow-large transition-all duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{classItem.class_name}</CardTitle>
            <CardDescription className="font-mono">
              Code: {classItem.join_code}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {status && (
              <Badge
                variant={
                  status === "active"
                    ? "default"
                    : status === "ended"
                    ? "destructive"
                    : "secondary"
                }
              >
                {status === "ended" ? (
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                    Ended
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
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{classItem.students_count || 0} students</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{classItem.sessions_count || 0} sessions</span>
          </div>
        </div>

        {classItem.last_session && (
          <p className="text-xs text-muted-foreground">
            Last session: {classItem.last_session}
          </p>
        )}

        <div className="flex space-x-2">
          <Button
            variant={status === "active" ? "default" : "outline"}
            size="sm"
            className="w-full"
            onClick={() => {
              if (status === "active") {
                // Navigate to active attendance session
                onGoToAttendance(classItem);
              } else {
                // Start a new session
                onStartSession(classItem);
              }
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            {status === "active"
              ? "Go to Attendance"
              : status === "ended"
              ? "Start New Session"
              : "Start Session"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(classItem)}
          >
            View Details
          </Button>
          {status === "active" && (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => onEndSession(classItem)}
            >
              End Session
            </Button>
          )}
        </div>
        {status === "ended" && (
          <div className="text-center text-green-600 font-semibold mt-2">
            Class Ended
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
          (apiClasses || []).map((c) => enrichClassWithStats(c))
        );
        setClasses(enriched);

        // Load active sessions from backend to sync state
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.user_id) {
          const API_URL =
            import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
          const res = await fetch(
            `${API_URL}/api/faculty/sessions/active?faculty_id=${user.user_id}`
          );
          if (res.ok) {
            const activeSessionsData = await res.json();
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
    if (!newClass.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a class name.",
        variant: "destructive",
      });
      return;
    }
    try {
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
    }
  };

  // IMPORTANT: Option A flow — no popup here; just navigate with sessionId
  const handleStartSession = async (classItem) => {
    try {
      const session = await facultyAPI.startSession(classItem.class_id);
      const sessionId = session.session_id;
      if (!sessionId) throw new Error("Invalid session response");

      // (Optional) keep local context status but don't generate any code here
      startSession(classItem.class_id);

      // Navigate to attendance page with the sessionId — popup will be on the Code tab
      navigate(`/attendance/${classItem.class_id}?sessionId=${sessionId}`);

      toast({
        title: "Session Started",
        description: `${classItem.class_name} session is active.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to start session",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = async (classItem) => {
    try {
      const activeSession = sessions[classItem.class_id];
      if (!activeSession?.sessionId) throw new Error("No active session found");
      await facultyAPI.endSession(classItem.class_id, activeSession.sessionId);
      endSession(classItem.class_id);
      setEndedClassIds((prev) => [...prev, classItem.class_id]);
      toast({
        title: "Session Ended",
        description: `${classItem.class_name} session has ended.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to end session",
        variant: "destructive",
      });
    }
  };

  // NEW: Handle navigation to active attendance session
  const handleGoToAttendance = async (classItem) => {
    try {
      // Always fetch from backend to ensure we have the latest active session
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(
        `${API_URL}/class/${classItem.class_id}/active-session`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch active session");
      }

      const data = await res.json();

      if (data.session_id) {
        // Update context with the active session info
        if (!sessions[classItem.class_id]?.sessionId) {
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
          `/attendance/${classItem.class_id}?sessionId=${data.session_id}`
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

  const handleDeleteClass = async (classItem) => {
    try {
      await facultyAPI.deleteClass(classItem.class_id);
      setClasses((prev) =>
        prev.filter((cls) => cls.class_id !== classItem.class_id)
      );
      toast({
        title: "Class Deleted",
        description: `${classItem.class_name} has been deleted.`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (classItem) => {
    setSelectedClass(classItem);
    setDetailsOpen(true);
  };

  const filteredClasses = classes.filter((cls) =>
    cls.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeClasses = filteredClasses.filter(
    (cls) =>
      sessions[cls.class_id]?.status === "active" &&
      !endedClassIds.includes(cls.class_id)
  );
  const endedClasses = filteredClasses.filter(
    (cls) =>
      sessions[cls.class_id]?.status === "ended" ||
      endedClassIds.includes(cls.class_id)
  );
  const scheduledClasses = filteredClasses.filter(
    (cls) =>
      (!sessions[cls.class_id] ||
        (sessions[cls.class_id]?.status !== "active" &&
          sessions[cls.class_id]?.status !== "ended")) &&
      !endedClassIds.includes(cls.class_id)
  );

  return (
    <div className="min-h-screen bg-background" key={updateCounter}>
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Faculty Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your classes and attendance sessions
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="hero" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create Class</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Add a new class to your dashboard
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    placeholder="e.g., Computer Science 101"
                    value={newClass.name}
                    onChange={(e) =>
                      setNewClass({ ...newClass, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joinCode">Join Code (Optional)</Label>
                  <Input
                    id="joinCode"
                    placeholder="Leave empty to auto-generate"
                    value={newClass.joinCode}
                    onChange={(e) =>
                      setNewClass({ ...newClass, joinCode: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="default" onClick={handleCreateClass}>
                  Create Class
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
        </div>

        {/* Active Sessions */}
        {activeClasses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Active Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Ended Sessions */}
        {endedClasses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Ended Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Your Classes */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Classes</h2>
          {scheduledClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledClasses.map((classItem) => (
                <ClassCard
                  key={classItem.class_id}
                  classItem={classItem}
                  status={getSessionStatus(classItem.class_id)}
                  onViewDetails={handleViewDetails}
                  onDelete={handleDeleteClass}
                  onEndSession={handleEndSession}
                  onStartSession={handleStartSession}
                  onGoToAttendance={handleGoToAttendance}
                />
              ))}
            </div>
          ) : (
            <p>No scheduled classes.</p>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedClass ? selectedClass.class_name : "Class Details"}
            </DialogTitle>
            <DialogDescription>
              View attendance records and session details for this class
            </DialogDescription>
          </DialogHeader>
          {selectedClass && <ClassDetails classItem={selectedClass} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacultyDashboard;
