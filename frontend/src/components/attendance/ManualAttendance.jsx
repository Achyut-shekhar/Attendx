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

    console.log(
      `[ManualAttendance] toggleImmediate: student=${id}, willCheck=${willCheck}`
    );

    setRowLoading((prev) => ({ ...prev, [id]: true }));
    setLastUserActionAt(Date.now());
    try {
      if (willCheck) {
        console.log(
          `[ManualAttendance] Marking PRESENT: session=${sid}, student=${id}`
        );
        await attendanceApi.markManualAttendance(sid, id, "PRESENT");
      } else {
        console.log(
          `[ManualAttendance] Marking ABSENT: session=${sid}, student=${id}`
        );
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
    <Card className="shadow-sm">
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">Manual Attendance</CardTitle>
        <p className="text-sm text-muted-foreground">
          ✨ Check/uncheck students to mark them present or absent. You can
          override attendance marked via code.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-0">
        {/* Mobile stacked list */}
        <div className="space-y-3 sm:hidden">
          {students.map((s) => {
            const isMarked = attendance.some(
              (a) =>
                Number(a.session_id) === Number(sessionId) &&
                a.attendance_status === "PRESENT" &&
                (a.student_id === s.user_id || a.student_name === s.name)
            );
            const isChecked = attended.includes(s.user_id);

            return (
              <div
                key={`${s.user_id}-mobile`}
                className="rounded-xl border bg-card/70 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {s.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                    <p className="text-xs font-medium text-primary">
                      Roll: {s.roll_number || "—"}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      Section: {s.section || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => toggleImmediate(s, checked)}
                      disabled={loading || !!rowLoading[s.user_id]}
                    />
                    {isMarked && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                      >
                        Via Code
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop/tablet table */}
        <div className="hidden overflow-hidden rounded-t-none rounded-b-lg border-t border-border sm:block">
          <div className="overflow-x-auto">
            <Table className="min-w-[600px] text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Roll</TableHead>
                  <TableHead className="w-24">Section</TableHead>
                  <TableHead className="min-w-[160px]">Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="w-40 text-right">
                    Mark Present
                  </TableHead>
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

                  return (
                    <TableRow key={s.user_id}>
                      <TableCell className="text-sm font-medium">
                        {s.roll_number || "—"}
                      </TableCell>
                      <TableCell className="text-sm uppercase text-muted-foreground">
                        {s.section || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.email}
                      </TableCell>
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
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          ✓ Attendance is automatically saved when you check/uncheck students
        </div>
      </CardContent>
    </Card>
  );
};

export default ManualAttendance;
