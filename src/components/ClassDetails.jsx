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
import { Button } from "@/components/ui/button";
import { Download, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  // Date range export states
  const [showDateRangeDialog, setShowDateRangeDialog] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const pollRef = useRef(null);

  /* ---------------------------------------------------
     Export attendance to Excel
  --------------------------------------------------- */
  // Export current session only
  const exportCurrentSession = () => {
    if (rows.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance data to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for export
    const exportData = rows.map((r) => ({
      "Roll Number": r.roll_number || "—",
      "Student Name": r.student_name,
      Status: r.status === "LATE" ? "PRESENT" : r.status,
      "Marked At": r.marked_at ? new Date(r.marked_at).toLocaleString() : "—",
    }));

    // Add summary row
    exportData.push({});
    exportData.push({
      "Roll Number": "",
      "Student Name": "SUMMARY",
      Status: "",
      "Marked At": "",
    });
    exportData.push({
      "Roll Number": "",
      "Student Name": "Present",
      Status: totals.present,
      "Marked At": "",
    });
    exportData.push({
      "Roll Number": "",
      "Student Name": "Late",
      Status: totals.late,
      "Marked At": "",
    });
    exportData.push({
      "Roll Number": "",
      "Student Name": "Absent",
      Status: totals.absent,
      "Marked At": "",
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");

    // Generate filename
    const sessionInfo = sessions.find((s) => s.session_id === selectedSession);
    const sessionTime = sessionInfo
      ? new Date(sessionInfo.start_time).toLocaleTimeString().replace(/:/g, "-")
      : "session";
    const filename = `${classItem.class_name}_${selectedDate}_${sessionTime}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

    toast({
      title: "Success",
      description: "Current session exported successfully.",
    });
  };

  // Export all sessions for selected date
  const exportCurrentDate = async () => {
    if (sessions.length === 0) {
      toast({
        title: "No Data",
        description: "No sessions found for this date.",
        variant: "destructive",
      });
      return;
    }

    try {
      setExportLoading(true);
      setExportProgress(`Exporting ${sessions.length} session(s)...`);
      const wb = XLSX.utils.book_new();

      // Fetch attendance for each session with progress
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        setExportProgress(
          `Processing session ${i + 1} of ${sessions.length}...`
        );

        const data = await facultyAPI.getSessionAttendanceFlat(
          session.session_id
        );
        const recs = Array.isArray(data?.records) ? data.records : [];

        const exportData = recs.map((r) => ({
          "Roll Number": r.roll_number || "—",
          "Student Name": r.student_name,
          Status: r.status === "LATE" ? "PRESENT" : r.status,
          "Marked At": r.marked_at
            ? new Date(r.marked_at).toLocaleString()
            : "—",
        }));

        // Add summary
        const present = recs.filter(
          (x) => x.status === "PRESENT" || x.status === "LATE"
        ).length;
        const absent = recs.filter((x) => x.status === "ABSENT").length;

        exportData.push({});
        exportData.push({
          "Roll Number": "",
          "Student Name": "SUMMARY",
          Status: "",
          "Marked At": "",
        });
        exportData.push({
          "Roll Number": "",
          "Student Name": "Present",
          Status: present,
          "Marked At": "",
        });
        exportData.push({
          "Roll Number": "",
          "Student Name": "Absent",
          Status: absent,
          "Marked At": "",
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        // Use index to ensure unique sheet names
        const sheetName = `Session_${i + 1}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const filename = `${classItem.class_name}_${selectedDate}_AllSessions.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Success",
        description: `Exported ${sessions.length} session(s) successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export sessions.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
      setExportProgress("");
    }
  };

  // Export date range
  const exportDateRange = async () => {
    try {
      setExportLoading(true);
      setExportProgress("Loading sessions...");

      // Get all dates in range
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        toast({
          title: "Invalid Range",
          description: "Start date must be before end date.",
          variant: "destructive",
        });
        setExportLoading(false);
        setExportProgress("");
        return;
      }

      // Fetch all sessions at once using the optimized endpoint
      const allData = await facultyAPI.getAllSessionsWithAttendance(
        classItem.class_id
      );

      if (!allData || !allData.sessions || allData.sessions.length === 0) {
        toast({
          title: "No Data",
          description: "No sessions found for this class.",
          variant: "destructive",
        });
        setExportLoading(false);
        setExportProgress("");
        return;
      }

      // Filter sessions within the date range
      const filteredSessions = allData.sessions.filter((session) => {
        const sessionDate = new Date(session.start_time);
        return sessionDate >= start && sessionDate <= end;
      });

      if (filteredSessions.length === 0) {
        toast({
          title: "No Data",
          description: "No sessions found in the selected date range.",
          variant: "destructive",
        });
        setExportLoading(false);
        setExportProgress("");
        return;
      }

      const wb = XLSX.utils.book_new();

      // Process filtered sessions with progress updates
      for (let i = 0; i < filteredSessions.length; i++) {
        const session = filteredSessions[i];
        setExportProgress(
          `Processing session ${i + 1} of ${filteredSessions.length}...`
        );

        const recs = Array.isArray(session.records) ? session.records : [];

        const exportData = recs.map((r) => ({
          "Roll Number": r.roll_number || "—",
          "Student Name": r.student_name,
          Status: r.status === "LATE" ? "PRESENT" : r.status,
          "Marked At": r.marked_at
            ? new Date(r.marked_at).toLocaleString()
            : "—",
        }));

        // Add summary from totals
        const totals = session.totals || { present: 0, late: 0, absent: 0 };
        const present = totals.present + totals.late;

        exportData.push({});
        exportData.push({
          "Roll Number": "",
          "Student Name": "SUMMARY",
          Status: "",
          "Marked At": "",
        });
        exportData.push({
          "Roll Number": "",
          "Student Name": "Present",
          Status: present,
          "Marked At": "",
        });
        exportData.push({
          "Roll Number": "",
          "Student Name": "Absent",
          Status: totals.absent,
          "Marked At": "",
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const dateStr = new Date(session.start_time).toLocaleDateString(
          "en-CA"
        );
        // Use index to ensure unique sheet names
        const sheetName = `${dateStr}_S${i + 1}`.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const filename = `${classItem.class_name}_${startDate.toLocaleDateString(
        "en-CA"
      )}_to_${endDate.toLocaleDateString("en-CA")}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Success",
        description: `Exported ${filteredSessions.length} session(s) from date range.`,
      });
      setShowDateRangeDialog(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to export date range.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
      setExportProgress("");
    }
  };

  // Export all dates (all time)
  const exportAllDates = async () => {
    try {
      setExportLoading(true);
      setExportProgress("Loading all sessions...");

      // Use the new optimized endpoint that fetches everything in one query
      const data = await facultyAPI.getAllSessionsWithAttendance(
        classItem.class_id
      );

      if (!data || !data.sessions || data.sessions.length === 0) {
        toast({
          title: "No Data",
          description: "No sessions found for this class.",
          variant: "destructive",
        });
        setExportLoading(false);
        setExportProgress("");
        return;
      }

      const wb = XLSX.utils.book_new();
      const sessions = data.sessions;
      const usedSheetNames = new Set();

      console.log(`Total sessions to export: ${sessions.length}`);

      // Process sessions with progress updates
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        setExportProgress(
          `Processing session ${i + 1} of ${sessions.length}...`
        );

        console.log(`Exporting session ${i + 1}: ${session.start_time}`);

        const recs = Array.isArray(session.records) ? session.records : [];

        const exportData = recs.map((r) => ({
          "Roll Number": r.roll_number || "—",
          "Student Name": r.student_name,
          Status: r.status === "LATE" ? "PRESENT" : r.status,
          "Marked At": r.marked_at
            ? new Date(r.marked_at).toLocaleString()
            : "—",
        }));

        // Add summary from totals
        const totals = session.totals || { present: 0, late: 0, absent: 0 };
        const present = totals.present + totals.late; // Combine present and late

        exportData.push({});
        exportData.push({
          "Roll Number": "",
          "Student Name": "SUMMARY",
          Status: "",
          "Marked At": "",
        });
        exportData.push({
          "Roll Number": "",
          "Student Name": "Present",
          Status: present,
          "Marked At": "",
        });
        exportData.push({
          "Roll Number": "",
          "Student Name": "Absent",
          Status: totals.absent,
          "Marked At": "",
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const dateStr = new Date(session.start_time).toLocaleDateString(
          "en-CA"
        );
        const timeStr = new Date(session.start_time)
          .toLocaleTimeString("en-US", { hour12: false })
          .replace(/:/g, "-");

        // Create unique sheet name by appending counter if duplicate
        let baseSheetName = `${dateStr}_${timeStr}`.substring(0, 28);
        let sheetName = baseSheetName;
        let counter = 1;

        while (usedSheetNames.has(sheetName)) {
          sheetName = `${baseSheetName}_${counter}`;
          counter++;
        }

        usedSheetNames.add(sheetName);
        console.log(`Adding sheet: ${sheetName}`);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      console.log(`Total sheets in workbook: ${wb.SheetNames.length}`);

      const filename = `${classItem.class_name}_AllSessions_Complete.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Success",
        description: `Exported ${sessions.length} session(s) successfully.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to export all sessions. " + error.message,
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
      setExportProgress("");
    }
  };

  /* ---------------------------------------------------
     STEP 1 — Load ALL sessions on the selected date
  --------------------------------------------------- */
  const loadSessions = async () => {
    try {
      setLoading(true);
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
        setLoading(false); // Clear loading when no sessions
      }
    } catch (err) {
      console.error("[ClassDetails] Error loading sessions:", err);
      toast({
        title: "Error",
        description: "Failed to load sessions.",
        variant: "destructive",
      });
      setLoading(false); // Clear loading on error
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
        recs.sort((a, b) => {
          // Sort by roll number first, then by name if roll numbers are equal or missing
          const rollA = a.roll_number || "";
          const rollB = b.roll_number || "";
          if (rollA && rollB) {
            const rollCompare = rollA.localeCompare(rollB, undefined, {
              numeric: true,
            });
            if (rollCompare !== 0) return rollCompare;
          }
          // If roll numbers are the same or missing, sort by name
          return a.student_name.localeCompare(b.student_name);
        })
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Attendance for {selectedDate}</CardTitle>
              <div className="flex flex-col items-end gap-2">
                {exportProgress && (
                  <span className="text-xs text-muted-foreground">
                    {exportProgress}
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2"
                      disabled={exportLoading}
                    >
                      <Download className="h-4 w-4" />
                      {exportLoading ? "Exporting..." : "Export to Excel"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={exportCurrentSession}
                      disabled={rows.length === 0}
                    >
                      Current Session Only
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={exportCurrentDate}
                      disabled={sessions.length === 0}
                    >
                      Current Date ({selectedDate})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDateRangeDialog(true)}
                    >
                      Custom Date Range...
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportAllDates}>
                      All Dates (Complete History)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent>
              {/* Session Dropdown */}
              {sessions.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground">
                    Select Session
                  </label>
                  <select
                    className="border rounded-md w-full p-2 mt-1 bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
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
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.student_id}>
                      <TableCell>{r.roll_number || "—"}</TableCell>
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

      {/* Date Range Export Dialog */}
      <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Date Range</DialogTitle>
            <DialogDescription>
              Select a date range to export all attendance sessions within that
              period.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  className="rounded-md border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => d && setEndDate(d)}
                  className="rounded-md border"
                />
              </div>
            </div>
          </div>
          {exportProgress && (
            <div className="text-sm text-center text-muted-foreground py-2">
              {exportProgress}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowDateRangeDialog(false)}
              disabled={exportLoading}
            >
              Cancel
            </Button>
            <Button onClick={exportDateRange} disabled={exportLoading}>
              {exportLoading ? "Exporting..." : "Export"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassDetails;
