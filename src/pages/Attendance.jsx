import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAttendance } from "@/contexts/AttendanceContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeGeneration from "../components/attendance/CodeGeneration";
import LocationCheck from "../components/attendance/LocationCheck";
import ManualAttendance from "../components/attendance/ManualAttendance";

const Attendance = () => {
  const { classId } = useParams();
  const { startSession, getSessionStatus } = useAttendance();
  const [activeMethod, setActiveMethod] = useState("manual");

  // Only start session on initial mount or when method is explicitly changed by user
  useEffect(() => {
    const currentStatus = getSessionStatus(classId);
    if (classId && !currentStatus) {
      startSession(classId, "manual"); // Start with manual by default
    }
  }, [classId]); // Only depend on classId changes

  // Mock class data (for local preview)
  const classes = {
    1: { name: "Computer Science 101" },
    2: { name: "Database Systems" },
    11: { name: "Mathematics 101" },
  };

  const className = classes[classId]?.name || "New Course";

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">
        Take Attendance for {className}
      </h1>
      <p className="text-muted-foreground mb-4">Class ID: {classId}</p>

      <Tabs
        defaultValue="manual"
        value={activeMethod}
        onValueChange={(method) => setActiveMethod(method)}
      >
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="code">Code Generation</TabsTrigger>
          <TabsTrigger value="location">Location Check</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <ManualAttendance classId={classId} />
        </TabsContent>
        <TabsContent value="code">
          <CodeGeneration classId={classId} />
        </TabsContent>
        <TabsContent value="location">
          <LocationCheck classId={classId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Attendance;
