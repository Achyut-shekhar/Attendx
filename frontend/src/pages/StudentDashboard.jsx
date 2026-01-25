import React, { useState, useEffect } from "react";
import {
  Plus,
  Users,
  Code,
  Loader,
  GraduationCap,
  TrendingUp,
  BookOpen,
  Calendar,
  Sparkles,
} from "lucide-react";
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
  DialogDescription,
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
    week.push(<div key={`empty-start-${i}`} className="h-10 sm:h-12" />);

  for (let day = 1; day <= daysInMonth; day++) {
    const status = records[day];
    const counts = sessionCounts[day];

    week.push(
      <div
        key={day}
        className={`h-10 sm:h-12 flex flex-col items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition-all
        ${
          status === "present"
            ? "bg-green-500 text-white shadow-sm"
            : status === "absent"
            ? "bg-red-500 text-white shadow-sm"
            : "bg-muted/50 text-muted-foreground"
        }`}
      >
        <span className={counts ? "text-[10px] sm:text-xs" : ""}>{day}</span>
        {counts && (
          <span className="text-[8px] sm:text-[10px] opacity-90 font-normal">
            {counts.present}/{counts.total}
          </span>
        )}
      </div>
    );

    if (week.length === 7 || day === daysInMonth) {
      if (day === daysInMonth && week.length < 7) {
        for (let j = week.length; j < 7; j++)
          week.push(<div key={`empty-end-${j}`} className="h-10 sm:h-12" />);
      }
      weeks.push(
        <div key={`week-${day}`} className="grid grid-cols-7 gap-1 sm:gap-2">
          {week}
        </div>
      );
      week = [];
    }
  }

  return (
    <div className="space-y-3 p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (month === 1) {
              setMonth(12);
              setYear(year - 1);
            } else {
              setMonth(month - 1);
            }
          }}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <span className="font-semibold text-sm sm:text-lg">
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
          className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground">
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
        <div>Sun</div>
      </div>

      <div className="space-y-1 sm:space-y-2">{weeks}</div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-green-500"></div>
          <span className="text-xs sm:text-sm">Present</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-500"></div>
          <span className="text-xs sm:text-sm">Absent</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-muted"></div>
          <span className="text-xs sm:text-sm">No Class</span>
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
  const [section, setSection] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

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
              section: cls.section || "",
            };
          } catch {
            return {
              id: cls.class_id,
              name: cls.class_name,
              facultyName: "Unknown Faculty",
              attendanceRate: 0,
              mode: "CODE",
              joinCode: cls.join_code,
              section: cls.section || "",
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
      setIsJoiningClass(true);
      await studentAPI.joinClass(joinCode, rollNumber, section);
      toast({
        title: "Successfully Joined",
        description: "You are now enrolled.",
      });
      setJoinCode("");
      setRollNumber("");
      setSection("");
      setIsJoinDialogOpen(false);
      fetchEnrolledClasses();
    } catch (error) {
      toast({
        title: "Error Joining",
        description: "Invalid join code.",
        variant: "destructive",
      });
    } finally {
      setIsJoiningClass(false);
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
        const date = new Date(record.start_time || record.recorded_at); // Use session start time if available
        if (isNaN(date.getTime())) return;
        
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
      // DEBUG:
      console.log("Records received:", records);
      if(records.length > 0) {
        console.log("First record time:", records[0].start_time, records[0].marked_at);
      }
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
      setIsSubmittingAttendance(true);
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
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Header />
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading your classes...
          </p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalSessions = enrolledClasses.reduce(
    (sum, c) => sum + (c.sessionsCount || 0),
    0
  );
  const avgAttendance =
    enrolledClasses.length > 0
      ? (
          enrolledClasses.reduce((sum, c) => sum + c.attendanceRate, 0) /
          enrolledClasses.length
        ).toFixed(1)
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                Student Dashboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground ml-11 sm:ml-12">
              {enrolledClasses.length} enrolled class
              {enrolledClasses.length !== 1 ? "es" : ""}
            </p>
          </div>

          {/* Join Class Button */}
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="hero"
                className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Join Class
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  Join a Class
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                   Enter the code provided by your faculty to join a class.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Join Code</Label>
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter class join code"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Roll Number</Label>
                  <Input
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Enter your roll number"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Section (Optional)
                  </Label>
                  <Input
                    value={section}
                    onChange={(e) => setSection(e.target.value.toUpperCase())}
                    placeholder="e.g., A or B1"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps faculty differentiate students when viewing rosters.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsJoinDialogOpen(false)}
                  className="h-10 sm:h-11"
                  disabled={isJoiningClass}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleJoinClass} 
                  className="h-10 sm:h-11"
                  disabled={isJoiningClass}
                >
                  {isJoiningClass ? (
                    <span className="flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin" />
                      Joining...
                    </span>
                  ) : "Join"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {enrolledClasses.length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Classes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {avgAttendance}%
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Avg Attendance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-semibold">Your Classes</h2>
          </div>

          {enrolledClasses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {enrolledClasses.map((c) => (
                <Card
                  key={c.id}
                  className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Decorative gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <CardHeader className="relative pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg font-semibold truncate">
                          {c.name}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-1">
                          {c.facultyName}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          c.attendanceRate >= 75
                            ? "default"
                            : c.attendanceRate >= 50
                            ? "secondary"
                            : "destructive"
                        }
                        className={`text-xs font-semibold ${
                          c.attendanceRate >= 75 ? "bg-green-600" : ""
                        }`}
                      >
                        {c.attendanceRate.toFixed(1)}%
                      </Badge>
                    </div>
                    {c.section && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          Section: {c.section}
                        </Badge>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="relative space-y-3 pt-0">
                    <Button
                      className="w-full h-10 sm:h-11 text-sm shadow-lg hover:shadow-xl transition-all"
                      onClick={() => {
                        setSelectedClass(c);
                        setCodeDialogOpen(true);
                      }}
                    >
                      <Code className="h-4 w-4 mr-2" /> Enter Code
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleViewDetails(c)}
                      className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <GraduationCap className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium mb-2">No classes yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Join your first class to get started
                </p>
                <Button onClick={() => setIsJoinDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Join Class
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Attendance Details */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedClass && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    {selectedClass.name} - Attendance Details
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Section: {selectedClass.section || "Not set"}
                  </DialogDescription>
                </DialogHeader>

                {recordsLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Loading records...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Statistics Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card className="border-border/50 bg-muted/30">
                        <CardHeader className="p-3 sm:p-4 pb-2">
                          <CardDescription className="text-xs">
                            Total Sessions
                          </CardDescription>
                          <CardTitle className="text-xl sm:text-2xl">
                            {attendanceRecords.records?.length || 0}
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      <Card className="border-border/50 bg-green-500/5">
                        <CardHeader className="p-3 sm:p-4 pb-2">
                          <CardDescription className="text-xs">
                            Present
                          </CardDescription>
                          <CardTitle className="text-xl sm:text-2xl text-green-600">
                            {attendanceRecords.records?.filter(
                              (r) =>
                                r.status === "PRESENT" || r.status === "LATE"
                            ).length || 0}
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      <Card className="border-border/50 bg-red-500/5">
                        <CardHeader className="p-3 sm:p-4 pb-2">
                          <CardDescription className="text-xs">
                            Absent
                          </CardDescription>
                          <CardTitle className="text-xl sm:text-2xl text-red-600">
                            {attendanceRecords.records?.filter(
                              (r) => r.status === "ABSENT"
                            ).length || 0}
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      <Card className="border-border/50 bg-primary/5">
                        <CardHeader className="p-3 sm:p-4 pb-2">
                          <CardDescription className="text-xs">
                            Attendance Rate
                          </CardDescription>
                          <CardTitle className="text-xl sm:text-2xl text-primary">
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
                                        record.start_time || record.recorded_at
                                      ).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(
                                        record.start_time || record.recorded_at
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
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Enter Attendance Code</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 px-6 overflow-y-auto flex-1">
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
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg w-full overflow-hidden">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2 text-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 flex-shrink-0"
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
                    <p className="text-sm text-green-700 break-words">
                      Your location has been captured. When you submit, it will
                      be verified against the classroom radius.
                    </p>
                    <div className="mt-2 text-xs text-green-600 font-mono break-all">
                      📍 {studentLocation.latitude.toFixed(6)},{" "}
                      {studentLocation.longitude.toFixed(6)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 border-t border-border bg-background">
              <Button
                variant="outline"
                onClick={() => {
                  setCodeDialogOpen(false);
                  setStudentLocation(null);
                }}
                className="min-h-[44px] w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCodeSubmit}
                disabled={!enteredCode.trim() || isSubmittingAttendance}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {isSubmittingAttendance ? (
                  <span className="flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : studentLocation ? (
                  "Submit with Location ✓"
                ) : (
                  "Submit Code"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentDashboard;
