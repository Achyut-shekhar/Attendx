import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { attendanceApi } from "@/api/attendance";

const ManualAttendance = ({ classId, sessionId, students = [], attendance = [] }) => {
  const { toast } = useToast();
  const [attended, setAttended] = useState([]);

  // Pre-check those already present for this session
  useEffect(() => {
    const sid = Number(sessionId);
    const alreadyPresent = new Set(
      attendance
        .filter((r) => Number(r.session_id) === sid && r.attendance_status === "PRESENT")
        .map((r) => r.student_id) // will be undefined if backend doesn't include it
    );
    // fallback by name if id missing
    const presentByName = new Set(
      attendance
        .filter((r) => Number(r.session_id) === sid && r.attendance_status === "PRESENT")
        .map((r) => r.student_name)
    );

    const prechecked = students
      .filter((s) => alreadyPresent.has(s.user_id) || presentByName.has(s.name))
      .map((s) => s.user_id);

    setAttended(prechecked);
  }, [attendance, students, sessionId]);

  const toggle = (id) => {
    setAttended((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    try {
      if (!sessionId) throw new Error("No active session id");

      const sid = Number(sessionId);
      // Mark each selected student
      for (const studentId of attended) {
        await attendanceApi.markManualAttendance(sid, studentId);
      }

      toast({
        title: "Attendance Submitted",
        description: `${attended.length} students marked PRESENT.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e.message || "Failed to submit attendance",
        variant: "destructive",
      });
    }
  };

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
            {students.map((s) => (
              <TableRow key={s.user_id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell className="text-right">
                  <Checkbox
                    checked={attended.includes(s.user_id)}
                    onCheckedChange={() => toggle(s.user_id)}
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
