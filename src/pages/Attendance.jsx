import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
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
        </div>
        <p className="text-muted-foreground">
          Class ID: {classId} • Session ID: {sessionId || "—"}
        </p>
      </div>

      {/* ✅ Session Status Card */}
      {session && (
        <Card className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Status
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  {session.status === "ACTIVE" && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  )}
                  {session.status}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Started
                </p>
                <p className="text-base font-semibold text-foreground">
                  {new Date(session.start_time).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-600 dark:text-purple-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Students
                </p>
                <p className="text-base font-semibold text-foreground">
                  {students.length}{" "}
                  <span className="text-sm text-muted-foreground">
                    enrolled
                  </span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={activeMethod} onValueChange={setActiveMethod}>
        <TabsList>
          <TabsTrigger value="manual">Manual Attendance</TabsTrigger>
          <TabsTrigger value="code">Code Generation</TabsTrigger>
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

        {/* ✅ Location Based Attendance
        <TabsContent value="location">
          <LocationCheck classId={classId} sessionId={sessionId} />
        </TabsContent> */}
      </Tabs>
    </div>
  );
};

export default Attendance;
