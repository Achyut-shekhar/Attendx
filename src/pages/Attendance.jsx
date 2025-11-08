import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CodeGeneration from "@/components/attendance/CodeGeneration";
import LocationCheck from "@/components/attendance/LocationCheck";
import ManualAttendance from "@/components/attendance/ManualAttendance";

import { attendanceApi } from "@/api/attendance";
import { classesAPI } from "@/api/classes";

const Attendance = () => {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [activeMethod, setActiveMethod] = useState("code");

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
      <h1 className="text-2xl font-bold mb-2">Take Attendance</h1>
      <p className="text-muted-foreground mb-4">
        Class ID: {classId} • Session ID: {sessionId || "—"}
      </p>

      <Tabs value={activeMethod} onValueChange={setActiveMethod}>
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
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
