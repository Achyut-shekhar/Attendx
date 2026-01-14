import { useMemo } from "react";
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
import { useToast } from "@/components/ui/use-toast";

/**
 * Props:
 * - classId, sessionId (strings from route)
 * - session: { generated_code, status, session_id, ... }
 * - students: [{ user_id, name, email }]
 * - attendance: [{ session_id, student_id?, student_name, attendance_status, marked_at }, ...]
 *
 * NOTE: We don't fetch here anymore — Attendance.jsx already refreshes
 * all 3 blocks (session, students, attendance) every 3 seconds.
 */
export default function CodeGeneration({
  classId,
  sessionId,
  session,
  students = [],
  attendance = [],
}) {
  const { toast } = useToast();
  const code = session?.generated_code || "";
  const isClosed = session?.status === "CLOSED";
  const sid = Number(sessionId);

  // Build a quick lookup to know who is PRESENT for THIS session
  const presentSet = useMemo(() => {
    const set = new Set();
    for (const r of attendance) {
      if (Number(r.session_id) !== sid) continue;
      if (r.attendance_status === "PRESENT") {
        // Prefer student_id if backend provides it; fall back to name-safe key
        if (r.student_id != null) set.add(`id:${r.student_id}`);
        else if (r.student_name) set.add(`name:${r.student_name}`);
      }
    }
    return set;
  }, [attendance, sid]);

  const isPresent = (student) => {
    // Try id match first; then name match (for older backend response shape)
    if (presentSet.has(`id:${student.user_id}`)) return true;
    if (presentSet.has(`name:${student.name}`)) return true;
    return false;
  };

  const showPopup = () => {
    if (!code) {
      toast({
        title: "No code",
        description: "Start a session from the Faculty Dashboard first.",
        variant: "destructive",
      });
      return;
    }
    alert(`Share this code with students:\n\n${code}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Code Generation Attendance</CardTitle>
        <CardDescription>
          Shows the SAME code created when you started the session. Button is
          disabled after ending the session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-center">
          <Button onClick={showPopup} disabled={!code || isClosed}>
            Show Code Popup
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (code) {
                navigator.clipboard.writeText(code);
                toast({
                  title: "Copied",
                  description: "Code copied to clipboard.",
                });
              }
            }}
            disabled={!code || isClosed}
          >
            Copy Code
          </Button>
          <div className="text-2xl font-bold tracking-widest">
            {code || "—"}
          </div>
          {isClosed && <Badge variant="destructive">Session Closed</Badge>}
        </div>

        <div className="border-t pt-4">
          <div className="text-sm text-muted-foreground mb-2">
            Enrolled Students
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll Number</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">
                  Status (this session)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const present = isPresent(s);
                return (
                  <TableRow key={s.user_id}>
                    <TableCell>{s.roll_number || "—"}</TableCell>
                    <TableCell className="uppercase text-muted-foreground">
                      {s.section || "—"}
                    </TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={present ? "default" : "outline"}>
                        {present ? "PRESENT" : "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {students.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No students enrolled in this class yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
