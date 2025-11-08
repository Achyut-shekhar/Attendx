import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { attendanceApi } from "@/api/attendance";
import { Badge } from "@/components/ui/badge";

const ManualAttendance = ({
  classId,
  sessionId,
  students = [],
  attendance = [],
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [attended, setAttended] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState({}); // per-student in-flight
  const [lastUserActionAt, setLastUserActionAt] = useState(0); // debounce auto-sync after manual toggles
  const [hasInitialized, setHasInitialized] = useState(false); // track if we've done initial sync

  // Pre-check those already present for this session
  useEffect(() => {
    const timeSinceLastAction = Date.now() - lastUserActionAt;

    console.log("[ManualAttendance] Sync check:", {
      hasInitialized,
      timeSinceLastAction,
      shouldBlock: hasInitialized && timeSinceLastAction < 3500,
      sessionId,
      attendanceCount: attendance.length,
    });

    // Briefly hold off syncing from backend after a manual toggle
    if (hasInitialized && timeSinceLastAction < 3500) {
      console.log(
        "[ManualAttendance] BLOCKED sync - too soon after user action"
      );
      return;
    }

    const sid = Number(sessionId);
    const alreadyPresent = new Set(
      attendance
        .filter(
          (r) =>
            Number(r.session_id) === sid && r.attendance_status === "PRESENT"
        )
        .map((r) => r.student_id)
    );
    // fallback by name if id missing
    const presentByName = new Set(
      attendance
        .filter(
          (r) =>
            Number(r.session_id) === sid && r.attendance_status === "PRESENT"
        )
        .map((r) => r.student_name)
    );

    const prechecked = students
      .filter((s) => alreadyPresent.has(s.user_id) || presentByName.has(s.name))
      .map((s) => s.user_id);

    console.log("[ManualAttendance] Syncing from backend:", {
      alreadyPresentIds: Array.from(alreadyPresent),
      precheckedIds: prechecked,
      studentsCount: students.length,
    });

    setAttended(prechecked);
    if (!hasInitialized) setHasInitialized(true);
  }, [attendance, students, sessionId, lastUserActionAt, hasInitialized]);

  const toggleImmediate = async (student, nextChecked) => {
    // nextChecked (boolean) reflects the desired state AFTER the click.
    const id = student.user_id;
    if (rowLoading[id] || loading) return;
    const sid = Number(sessionId);
    const willCheck = !!nextChecked; // true => mark PRESENT, false => mark ABSENT

    setRowLoading((prev) => ({ ...prev, [id]: true }));
    setLastUserActionAt(Date.now());
    try {
      if (willCheck) {
        await attendanceApi.markManualAttendance(sid, id, "PRESENT");
      } else {
        await attendanceApi.unmarkAttendance(sid, id);
      }
      setAttended((prev) =>
        willCheck
          ? prev.includes(id)
            ? prev
            : [...prev, id]
          : prev.filter((x) => x !== id)
      );
      toast({
        title: willCheck ? "Marked Present" : "Marked Absent",
        description: student.name,
      });
    } catch (e) {
      console.error("Immediate toggle error:", e);
      toast({
        title: "Error",
        description: e.message || "Failed to update attendance",
        variant: "destructive",
      });
    } finally {
      setRowLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (!sessionId) throw new Error("No active session id");

      setLoading(true);
      const sid = Number(sessionId);

      // Get current state from attendance data
      const currentPresent = new Set(
        attendance
          .filter(
            (r) =>
              Number(r.session_id) === sid && r.attendance_status === "PRESENT"
          )
          .map((r) => r.student_id)
      );
      const currentPresentNames = new Set(
        attendance
          .filter(
            (r) =>
              Number(r.session_id) === sid && r.attendance_status === "PRESENT"
          )
          .map((r) => r.student_name)
      );

      let updatedCount = 0;

      // Process ALL students - mark present or absent
      for (const student of students) {
        const isCurrentlyMarked =
          currentPresent.has(student.user_id) ||
          currentPresentNames.has(student.name);
        const shouldBeMarked = attended.includes(student.user_id);

        if (shouldBeMarked) {
          // Always mark as present if checked (even if already marked)
          await attendanceApi.markManualAttendance(
            sid,
            student.user_id,
            "PRESENT"
          );
          updatedCount++;
        } else if (isCurrentlyMarked) {
          // Only unmark if currently marked but not checked
          await attendanceApi.unmarkAttendance(sid, student.user_id);
        }
      }

      toast({
        title: "Attendance Updated",
        description: `${updatedCount} students marked PRESENT.`,
      });

      // Navigate back to faculty dashboard after successful submission
      setTimeout(() => {
        navigate("/faculty-dashboard");
      }, 1000);
    } catch (e) {
      console.error("Manual attendance error:", e);
      toast({
        title: "Error",
        description: e.message || "Failed to submit attendance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Attendance</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          ✨ Check/uncheck students to mark them present or absent. You can
          override attendance marked via code.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Mark Present</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => {
              const isMarked = attendance.some(
                (a) =>
                  Number(a.session_id) === Number(sessionId) &&
                  a.attendance_status === "PRESENT" &&
                  (a.student_id === s.user_id || a.student_name === s.name)
              );
              const isChecked = attended.includes(s.user_id);
              const codeMarked = isMarked && !isChecked;

              return (
                <TableRow key={s.user_id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          toggleImmediate(s, checked)
                        }
                        disabled={loading || !!rowLoading[s.user_id]}
                      />
                      {isMarked && (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                        >
                          Via Code
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Button onClick={handleSubmit} className="mt-4" disabled={loading}>
          {loading ? "Updating..." : "Update Attendance"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ManualAttendance;
