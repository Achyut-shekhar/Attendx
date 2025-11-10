import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { facultyAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ClassDetails = ({ classItem }) => {
  const { toast } = useToast();

  const [date, setDate] = useState(new Date());
  const [month, setMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const selectedDate = date.toLocaleDateString("en-CA");

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ present: 0, late: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  const pollRef = useRef(null);

  /* ---------------------------------------------------
     STEP 1 — Load ALL sessions on the selected date
  --------------------------------------------------- */
  const loadSessions = async () => {
    try {
      const list = await facultyAPI.getSessionsByDate(
        classItem.class_id,
        selectedDate
      );

      setSessions(list);

      if (list.length > 0) {
        const latest = list[list.length - 1].session_id;
        setSelectedSession(latest); // auto-select latest
      } else {
        setSelectedSession(null);
        setRows([]);
        setTotals({ present: 0, late: 0, absent: 0 });
      }
    } catch (err) {
      console.error("[ClassDetails] Error loading sessions:", err);
      toast({
        title: "Error",
        description: "Failed to load sessions.",
        variant: "destructive",
      });
    }
  };

  /* ---------------------------------------------------
     STEP 2 — Load attendance for ONE specific session
  --------------------------------------------------- */
  const loadSessionAttendance = async (sessionId, silent = false) => {
    if (!sessionId) return;

    try {
      if (!silent) setLoading(true);

      const data = await facultyAPI.getSessionAttendanceFlat(sessionId);

      const recs = Array.isArray(data?.records) ? data.records : [];

      // Count LATE as PRESENT
      const present = recs.filter(
        (x) => x.status === "PRESENT" || x.status === "LATE"
      ).length;
      const absent = recs.filter((x) => x.status === "ABSENT").length;

      setTotals({ present, late: 0, absent });
      setRows(
        recs.sort((a, b) => a.student_name.localeCompare(b.student_name))
      );
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load attendance.",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /* ---------------------------------------------------
     Load sessions whenever date changes
  --------------------------------------------------- */
  useEffect(() => {
    loadSessions();
  }, [selectedDate]);

  /* ---------------------------------------------------
     Load attendance whenever selectedSession changes
  --------------------------------------------------- */
  useEffect(() => {
    if (!selectedSession) return;

    loadSessionAttendance(selectedSession, false);

    if (pollRef.current) clearInterval(pollRef.current);

    // Live update every 2s
    pollRef.current = setInterval(() => {
      loadSessionAttendance(selectedSession, true);
    }, 2000);

    return () => pollRef.current && clearInterval(pollRef.current);
  }, [selectedSession]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {classItem.class_name} Attendance
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="md:col-span-1 flex justify-center">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={date}
            onSelect={(d) => {
              if (!d) return;
              setDate(d);
              setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
            className="rounded-md border"
          />
        </div>

        {/* Right Panel */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Attendance for {selectedDate}</CardTitle>
            </CardHeader>

            <CardContent>
              {/* Session Dropdown */}
              {sessions.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium">Select Session</label>
                  <select
                    className="border rounded-md w-full p-2 mt-1"
                    value={selectedSession || ""}
                    onChange={(e) => setSelectedSession(Number(e.target.value))}
                  >
                    {sessions.map((s) => (
                      <option key={s.session_id} value={s.session_id}>
                        Session {s.session_id} at{" "}
                        {new Date(s.start_time).toLocaleTimeString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Present</p>
                  <p className="text-3xl font-bold text-green-700">
                    {totals.present}
                  </p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Absent</p>
                  <p className="text-3xl font-bold text-red-700">
                    {totals.absent}
                  </p>
                </div>
              </div>

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.student_id}>
                      <TableCell>{r.student_name}</TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            r.status === "PRESENT" || r.status === "LATE"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {r.status === "LATE" ? "PRESENT" : r.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {r.marked_at
                          ? new Date(r.marked_at).toLocaleTimeString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClassDetails;
