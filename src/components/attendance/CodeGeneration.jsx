import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAttendance } from "@/contexts/AttendanceContext";
import { useToast } from "@/components/ui/use-toast";
import { facultyAPI, studentAPI } from "@/services/api";
import { useNavigate } from "react-router-dom";

const CodeGeneration = ({ classId }) => {
  const [code, setCode] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const { getCurrentSession, endSession } = useAttendance();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await facultyAPI.getClassStudents(classId);
        setStudents(data);
        const statusMap = {};
        data.forEach((s) => {
          statusMap[s.user_id] = "Absent";
        });
        setAttendanceStatus(statusMap);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast({
          title: "Error",
          description: "Failed to fetch students",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchStudents();
  }, [classId, toast]);

  const generateCode = async () => {
    setIsGenerating(true);
    const session = getCurrentSession(classId);
    const codeToDisplay =
      session?.generatedCode ||
      Math.random().toString(36).substring(2, 8).toUpperCase();
    setCode(codeToDisplay);

    // Simulate students marking attendance
    setTimeout(() => {
      const updatedStatus = { ...attendanceStatus };
      students.forEach((s) => {
        if (Math.random() > 0.3) {
          updatedStatus[s.user_id] = "Present";
        }
      });
      setAttendanceStatus(updatedStatus);
      setIsGenerating(false);
    }, 3000);
  };

  const handleEndSession = async () => {
    try {
      const session = getCurrentSession(classId);
      if (!session?.sessionId) {
        throw new Error("No active session found");
      }

      // Mark attendance for all "Present" students
      for (const [studentId, status] of Object.entries(attendanceStatus)) {
        if (status === "Present") {
          await studentAPI.markAttendance({
            session_id: session.sessionId,
            student_id: parseInt(studentId),
          });
        }
      }

      const presentCount = Object.values(attendanceStatus).filter(
        (s) => s === "Present"
      ).length;

      toast({
        title: "Session Ended",
        description: `${presentCount} students marked as present.`,
      });

      endSession(classId);
      navigate("/faculty-dashboard");
    } catch (error) {
      console.error("Error ending session:", error);
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Code Generation Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading students...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Code Generation Attendance</CardTitle>
        <CardDescription>
          Generate a code for students to mark their attendance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-center mb-4">
          <Button onClick={generateCode} disabled={isGenerating || code}>
            {isGenerating ? "Generating..." : "Generate Code"}
          </Button>
          {code && <p className="text-2xl font-bold tracking-widest">{code}</p>}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.user_id}>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      attendanceStatus[student.user_id] === "Present"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {attendanceStatus[student.user_id]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {code && (
          <Button
            onClick={handleEndSession}
            variant="destructive"
            className="mt-4"
          >
            End Session
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default CodeGeneration;
