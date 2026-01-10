import React, { useState, useEffect } from "react";
import { Plus, Users, Code, Loader } from "lucide-react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { studentAPI } from "@/services/api";
import { attendanceApi } from "@/api/attendance";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LocationCapture from "@/components/attendance/LocationCapture";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ✅ Calendar Component with stats and session counts
const AttendanceCalendar = ({
  calendarByMonth = {},
  sessionCountsByMonth = {},
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1,
}) => {
  const [year, setYear] = React.useState(initialYear);
  const [month, setMonth] = React.useState(initialMonth);

  const monthKey = `${year}-${month}`;
  const records = calendarByMonth[monthKey] || {};
  const sessionCounts = sessionCountsByMonth[monthKey] || {};

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = (firstDay + 6) % 7;

  const weeks = [];
  let week = [];

  for (let i = 0; i < offset; i++)
    week.push(<div key={`empty-start-${i}`} className="h-12" />);

  for (let day = 1; day <= daysInMonth; day++) {
    const status = records[day];
    const counts = sessionCounts[day];

    week.push(
      <div
        key={day}
        className={`h-12 flex flex-col items-center justify-center rounded-lg text-sm font-medium
        ${
          status === "present"
            ? "bg-green-500 text-white"
            : status === "absent"
            ? "bg-red-500 text-white"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <span className={counts ? "text-xs" : ""}>{day}</span>
        {counts && (
          <span className="text-[10px] opacity-90 font-normal">
            {counts.present}/{counts.total}
          </span>
        )}
      </div>
    );

    if (week.length === 7 || day === daysInMonth) {
      if (day === daysInMonth && week.length < 7) {
        for (let j = week.length; j < 7; j++)
          week.push(<div key={`empty-end-${j}`} className="h-12" />);
      }
      weeks.push(
        <div key={`week-${day}`} className="grid grid-cols-7 gap-2">
          {week}
        </div>
      );
      week = [];
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => {
            if (month === 1) {
              setMonth(12);
              setYear(year - 1);
            } else {
              setMonth(month - 1);
            }
          }}
          className="p-1 rounded hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold text-lg">
          {monthNames[month - 1]} {year}
        </span>
        <button
          onClick={() => {
            if (month === 12) {
              setMonth(1);
              setYear(year + 1);
            } else {
              setMonth(month + 1);
            }
          }}
          className="p-1 rounded hover:bg-muted"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center font-semibold text-muted-foreground">
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
        <div>Sun</div>
      </div>

      {weeks}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-sm">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-sm">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted"></div>
          <span className="text-sm">No Class</span>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const { toast } = useToast();

  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null); // ✅ stores the class for which student enters code
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");

  // Location state for attendance
  const [studentLocation, setStudentLocation] = useState(null);

  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    fetchEnrolledClasses();
  }, []);

  const fetchEnrolledClasses = async () => {
    try {
      setLoading(true);
      const classes = await studentAPI.getEnrolledClasses();

      const classesWithDetails = await Promise.all(
        classes.map(async (cls) => {
          try {
            const details = await studentAPI.getClassDetails(cls.class_id);
            return {
              id: cls.class_id,
              name: cls.class_name,
              facultyName: details.faculty_name,
              attendanceRate: details.attendance_rate || 0,
              mode: "CODE",
              joinCode: cls.join_code,
            };
          } catch {
            return {
              id: cls.class_id,
              name: cls.class_name,
              facultyName: "Unknown Faculty",
              attendanceRate: 0,
              mode: "CODE",
              joinCode: cls.join_code,
            };
          }
        })
      );

      setEnrolledClasses(classesWithDetails);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch your classes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a join code.",
        variant: "destructive",
      });
      return;
    }

    if (!rollNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your roll number.",
        variant: "destructive",
      });
      return;
    }

    try {
      await studentAPI.joinClass(joinCode, rollNumber);
      toast({
        title: "Successfully Joined",
        description: "You are now enrolled.",
      });
      setJoinCode("");
      setRollNumber("");
      setIsJoinDialogOpen(false);
      fetchEnrolledClasses();
    } catch (error) {
      toast({
        title: "Error Joining",
        description: "Invalid join code.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = async (classItem) => {
    setSelectedClass(classItem);
    setRecordsLoading(true);

    try {
      const records = await studentAPI.getAttendanceRecords(classItem.id);

      // Group records by year-month, then by day
      const calendarByMonth = {};
      const sessionCountsByMonth = {};

      records.forEach((record) => {
        const date = new Date(record.recorded_at);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // 1-12
        const day = date.getDate();
        const monthKey = `${year}-${month}`;

        // Initialize month data if not exists
        if (!calendarByMonth[monthKey]) {
          calendarByMonth[monthKey] = {};
          sessionCountsByMonth[monthKey] = {};
        }

        // Initialize day data if not exists
        if (!sessionCountsByMonth[monthKey][day]) {
          sessionCountsByMonth[monthKey][day] = { total: 0, present: 0 };
        }

        sessionCountsByMonth[monthKey][day].total++;
        if (record.status === "PRESENT" || record.status === "LATE") {
          sessionCountsByMonth[monthKey][day].present++;
        }

        // Mark calendar day status based on majority
        // If at least one present, show green; if all absent, show red
        if (sessionCountsByMonth[monthKey][day].present > 0) {
          calendarByMonth[monthKey][day] = "present";
        } else {
          calendarByMonth[monthKey][day] = "absent";
        }
      });

      console.log("[StudentDashboard] Calendar by month:", calendarByMonth);
      console.log(
        "[StudentDashboard] Session counts by month:",
        sessionCountsByMonth
      );

      setAttendanceRecords({
        calendarByMonth,
        sessionCountsByMonth,
        records,
      });
    } catch (error) {
      console.error("[StudentDashboard] Error fetching attendance:", error);
      setAttendanceRecords({
        calendarByMonth: {},
        sessionCountsByMonth: {},
        records: [],
      });
    } finally {
      setRecordsLoading(false);
    }

    setDetailsOpen(true);
  };

  // Handler for location capture
  const handleLocationCaptured = (locationData) => {
    setStudentLocation(locationData);
  };

  // ✅✅ ENTER CODE FIXED — RECORD CLASS + UPPERCASE CODE
  const handleCodeSubmit = async () => {
    if (!enteredCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Enter a code.",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const finalCode = enteredCode.toUpperCase();

      // Submit with location if captured
      const response = await attendanceApi.submitAttendanceCode(
        user.user_id,
        finalCode,
        studentLocation
      );

      // Show detailed success message
      let description = "Your attendance is recorded.";
      if (response.distance !== null && response.distance !== undefined) {
        if (response.within_radius) {
          description = `✓ You are within the classroom radius (${Math.round(
            response.distance
          )}m away). Attendance marked as PRESENT.`;
        } else {
          description = `✗ You are outside the classroom radius (${Math.round(
            response.distance
          )}m away). Marked as ABSENT.`;
        }
      } else if (studentLocation) {
        description = "Your attendance is recorded with location verification.";
      }

      toast({
        title:
          response.within_radius === false
            ? "Outside Classroom Radius ⚠️"
            : "Attendance Marked ✅",
        description: description,
        variant: response.within_radius === false ? "destructive" : "default",
      });

      setEnteredCode("");
      setStudentLocation(null);
      setCodeDialogOpen(false);
      fetchEnrolledClasses();
    } catch (error) {
      toast({
        title: "Invalid Code ❌",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Header />
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">
              {enrolledClasses.length} enrolled class
              {enrolledClasses.length !== 1 ? "es" : ""}
            </p>
          </div>

          {/* Join Class */}
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4 mr-1" /> Join Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Class</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Join Code</Label>
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter class join code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <Input
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Enter your roll number"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsJoinDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleJoinClass}>Join</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledClasses.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>{c.name}</CardTitle>
                  <Badge>{c.attendanceRate.toFixed(2)}%</Badge>
                </div>
                <CardDescription>{c.facultyName}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* ✅ ALWAYS SHOW CODE BUTTON */}
                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedClass(c); // ✅ STORE SELECTED CLASS
                    setCodeDialogOpen(true);
                  }}
                >
                  <Code className="h-4 w-4 mr-2" /> Enter Code
                </Button>

                <Button variant="outline" onClick={() => handleViewDetails(c)}>
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Attendance Details */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedClass && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedClass.name} - Attendance Details
                  </DialogTitle>
                </DialogHeader>

                {recordsLoading ? (
                  <Loader className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <div className="space-y-6">
                    {/* Statistics Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Total Sessions</CardDescription>
                          <CardTitle className="text-2xl">
                            {attendanceRecords.records?.length || 0}
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Present</CardDescription>
                          <CardTitle className="text-2xl text-green-600">
                            {attendanceRecords.records?.filter(
                              (r) =>
                                r.status === "PRESENT" || r.status === "LATE"
                            ).length || 0}
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Absent</CardDescription>
                          <CardTitle className="text-2xl text-red-600">
                            {attendanceRecords.records?.filter(
                              (r) => r.status === "ABSENT"
                            ).length || 0}
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Attendance Rate</CardDescription>
                          <CardTitle className="text-2xl">
                            {attendanceRecords.records?.length > 0
                              ? Math.round(
                                  (attendanceRecords.records.filter(
                                    (r) =>
                                      r.status === "PRESENT" ||
                                      r.status === "LATE"
                                  ).length /
                                    attendanceRecords.records.length) *
                                    100
                                )
                              : 0}
                            %
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    </div>

                    {/* Calendar View */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Calendar View
                      </h3>
                      <AttendanceCalendar
                        calendarByMonth={
                          attendanceRecords.calendarByMonth || {}
                        }
                        sessionCountsByMonth={
                          attendanceRecords.sessionCountsByMonth || {}
                        }
                      />
                    </div>

                    {/* Session List */}
                    {attendanceRecords.records &&
                      attendanceRecords.records.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4">
                            Session History
                          </h3>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {attendanceRecords.records.map((record, idx) => (
                              <div
                                key={record.record_id || idx}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      record.status === "PRESENT" ||
                                      record.status === "LATE"
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }`}
                                  />
                                  <div>
                                    <p className="font-medium">
                                      {new Date(
                                        record.recorded_at
                                      ).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(
                                        record.recorded_at
                                      ).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    record.status === "PRESENT"
                                      ? "default"
                                      : record.status === "LATE"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                >
                                  {record.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ✅ Enter Attendance Code Dialog */}
        <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enter Attendance Code</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Attendance Code</Label>
                <Input
                  placeholder="e.g., XH9ZQA"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-2">
                <Label>Location Verification</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Some sessions may require location verification. Capture your
                  location to ensure attendance is recorded correctly.
                </p>
                <LocationCapture
                  onLocationCaptured={handleLocationCaptured}
                  autoCapture={false}
                />

                {studentLocation && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Location Ready</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Your location has been captured. When you submit, it will
                      be verified against the classroom radius.
                    </p>
                    <div className="mt-2 text-xs text-green-600 font-mono">
                      📍 {studentLocation.latitude.toFixed(6)},{" "}
                      {studentLocation.longitude.toFixed(6)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCodeDialogOpen(false);
                  setStudentLocation(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCodeSubmit} disabled={!enteredCode.trim()}>
                {studentLocation ? "Submit with Location ✓" : "Submit Code"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentDashboard;
