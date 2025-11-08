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

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// ✅ Calendar Component (unchanged)
const AttendanceCalendar = ({ records, initialYear = 2025, initialMonth = 9 }) => {
  const [year, setYear] = React.useState(initialYear);
  const [month, setMonth] = React.useState(initialMonth);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = (firstDay + 6) % 7;

  const weeks = [];
  let week = [];

  for (let i = 0; i < offset; i++)
    week.push(<div key={`empty-start-${i}`} className="h-12" />);

  for (let day = 1; day <= daysInMonth; day++) {
    const status = records[day];
    week.push(
      <div
        key={day}
        className={`h-12 flex items-center justify-center rounded-lg text-sm font-medium
        ${status === "present"
          ? "bg-green-500 text-white"
          : status === "absent"
          ? "bg-red-500 text-white"
          : "bg-muted text-muted-foreground"}`}
      >
        {day}
      </div>
    );

    if (week.length === 7 || day === daysInMonth) {
      if (day === daysInMonth && week.length < 7) {
        for (let j = week.length; j < 7; j++)
          week.push(<div key={`empty-end-${j}`} className="h-12" />);
      }
      weeks.push(<div key={`week-${day}`} className="grid grid-cols-7 gap-2">{week}</div>);
      week = [];
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonth(month === 1 ? 12 : month - 1)} className="p-1 rounded hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold text-lg">
          {monthNames[month - 1]} {year}
        </span>
        <button onClick={() => setMonth(month === 12 ? 1 : month + 1)} className="p-1 rounded hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center font-semibold text-muted-foreground">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      {weeks}
    </div>
  );
};

const StudentDashboard = () => {
  const { toast } = useToast();

  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null);  // ✅ stores the class for which student enters code
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");

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

    try {
      await studentAPI.joinClass(joinCode);
      toast({ title: "Successfully Joined", description: "You are now enrolled." });
      setJoinCode("");
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
      const calendar = {};

      records.forEach((record) => {
        const date = new Date(record.recorded_at);
        calendar[date.getDate()] =
          record.status === "PRESENT" ? "present" : "absent";
      });

      setAttendanceRecords(calendar);
    } catch {
      setAttendanceRecords({});
    } finally {
      setRecordsLoading(false);
    }

    setDetailsOpen(true);
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

      await attendanceApi.submitAttendanceCode(user.user_id, finalCode);

      toast({
        title: "Attendance Marked ✅",
        description: "Your attendance is recorded.",
      });

      setEnteredCode("");
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

              <div className="space-y-2 py-4">
                <Label>Join Code</Label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsJoinDialogOpen(false)}>
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
                  <Badge>{c.attendanceRate}%</Badge>
                </div>
                <CardDescription>{c.facultyName}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">

                {/* ✅ ALWAYS SHOW CODE BUTTON */}
                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedClass(c);   // ✅ STORE SELECTED CLASS
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
          <DialogContent className="max-w-3xl">
            {selectedClass && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedClass.name} - Attendance</DialogTitle>
                </DialogHeader>

                {recordsLoading ? (
                  <Loader className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <AttendanceCalendar records={attendanceRecords} />
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ✅ Enter Attendance Code Dialog */}
        <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Attendance Code</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label>Attendance Code</Label>
              <Input
                placeholder="e.g., XH9ZQA"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCodeSubmit}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default StudentDashboard;
