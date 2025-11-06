import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useAttendance } from "@/contexts/AttendanceContext";
import { facultyAPI, studentAPI } from "@/services/api";
import { useNavigate } from "react-router-dom";

const ManualAttendance = ({ classId }) => {
  const [students, setStudents] = useState([]);
  const [attended, setAttended] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { endSession, getCurrentSession } = useAttendance();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await facultyAPI.getClassStudents(classId);
        setStudents(data);
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

  const handleCheckboxChange = (studentId) => {
    setAttended((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async () => {
    try {
      const session = getCurrentSession(classId);
      if (!session?.sessionId) {
        throw new Error("No active session found");
      }

      // Mark attendance for each selected student
      for (const studentId of attended) {
        await studentAPI.markAttendance({
          session_id: session.sessionId,
          student_id: studentId,
        });
      }

      toast({
        title: "Attendance Submitted",
        description: `${attended.length} students marked as present.`,
      });

      endSession(classId);
      navigate("/faculty-dashboard");
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast({
        title: "Error",
        description: "Failed to submit attendance",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manual Attendance</CardTitle>
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
        <CardTitle>Manual Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Present</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.user_id}>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell className="text-right">
                  <Checkbox
                    checked={attended.includes(student.user_id)}
                    onCheckedChange={() =>
                      handleCheckboxChange(student.user_id)
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button onClick={handleSubmit} className="mt-4">
          Submit Attendance
        </Button>
      </CardContent>
    </Card>
  );
};

export default ManualAttendance;
