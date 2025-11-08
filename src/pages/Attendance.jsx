import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import CodeGeneration from "@/components/attendance/CodeGeneration";
import LocationCheck from "@/components/attendance/LocationCheck";
import ManualAttendance from "@/components/attendance/ManualAttendance";

import { attendanceApi } from "@/api/attendance";
import { classesAPI } from "@/api/classes";
import { facultyAPI } from "@/services/api";

const Attendance = () => {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeMethod, setActiveMethod] = useState("manual");

  // ✅ Real-time page data
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [isEndingSession, setIsEndingSession] = useState(false);

  // ✅ AUTO REFRESH — Every 3 seconds
  useEffect(() => {
    if (!classId || !sessionId) return;

    const loadData = async () => {
      try {
        // ✅ 1. Session details (code + status)
        const s = await attendanceApi.getSessionById(sessionId);
        setSession(s);

        // ✅ 2. Enrolled students
        const st = await classesAPI.getClassStudents(classId);
        setStudents(st);

        // ✅ 3. Attendance records (correct API)
        const att = await classesAPI.getClassAttendance(classId);
        setAttendance(att);

      } catch (err) {
        console.log("Live refresh error:", err);
      }
    };

    loadData(); // run immediately
    const interval = setInterval(loadData, 3000);

    return () => clearInterval(interval);
  }, [classId, sessionId]);

  // ✅ Handle End Session
  const handleEndSession = async () => {
    if (!window.confirm("Are you sure you want to end this session? You can still view records, but no more attendance will be marked.")) {
      return;
    }

    setIsEndingSession(true);
    try {
      await facultyAPI.endSession(Number(classId), Number(sessionId));
      toast({
        title: "Session Ended",
        description: "The attendance session has been ended successfully.",
      });
      // Stay on page to show results, but disable further marking
      setTimeout(() => {
        navigate("/faculty-dashboard");
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to end session",
        variant: "destructive",
      });
    } finally {
      setIsEndingSession(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* ✅ Header with Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/faculty-dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Take Attendance</h1>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndSession}
            disabled={isEndingSession}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isEndingSession ? "Ending..." : "End Session"}
          </Button>
        </div>
        <p className="text-muted-foreground">
          Class ID: {classId} • Session ID: {sessionId || "—"}
        </p>
      </div>

      {/* ✅ Session Status Card */}
      {session && (
        <Card className="mb-6 p-4 bg-blue-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold">Status:</span>
              <p className="text-blue-600 font-bold">{session.status}</p>
            </div>
            <div>
              <span className="font-semibold">Started:</span>
              <p className="text-sm">{new Date(session.start_time).toLocaleString()}</p>
            </div>
            <div>
              <span className="font-semibold">Students:</span>
              <p className="text-sm">{students.length} enrolled</p>
            </div>
            <div>
              <span className="font-semibold">Marked:</span>
              <p className="text-sm">{attendance.filter(a => a.session_id == sessionId && a.status === "PRESENT").length} present</p>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={activeMethod} onValueChange={setActiveMethod}>
        <TabsList>
          <TabsTrigger value="manual">Manual Attendance</TabsTrigger>
          <TabsTrigger value="code">Code Generation</TabsTrigger>
          <TabsTrigger value="location">Location Check</TabsTrigger>
        </TabsList>

        {/* ✅ Manual Attendance */}
        <TabsContent value="manual">
          <ManualAttendance
            classId={classId}
            sessionId={sessionId}
            students={students}
            attendance={attendance}
          />
        </TabsContent>

        {/* ✅ Code Attendance */}
        <TabsContent value="code">
          <CodeGeneration
            classId={classId}
            sessionId={sessionId}
            session={session}
            students={students}
            attendance={attendance}
          />
        </TabsContent>

        {/* ✅ Location Based Attendance */}
        <TabsContent value="location">
          <LocationCheck classId={classId} sessionId={sessionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Attendance;
