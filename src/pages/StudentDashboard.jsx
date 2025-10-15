import React, { useState } from "react";
import { Plus, Users, Code, MapPin, ClipboardList } from "lucide-react";
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

// Interactive Calendar-like Attendance View
import { ChevronLeft, ChevronRight } from "lucide-react";
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
const AttendanceCalendar = ({
  records,
  initialYear = 2025,
  initialMonth = 9,
}) => {
  const [year, setYear] = React.useState(initialYear);
  const [month, setMonth] = React.useState(initialMonth); // 1-based

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun, 1=Mon, ...
  const offset = (firstDay + 6) % 7; // Monday as start
  const weeks = [];
  let week = [];

  for (let i = 0; i < offset; i++) {
    week.push(<div key={`empty-start-${i}`} className="h-12" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const status = records[day];
    week.push(
      <div
        key={day}
        className={`h-12 flex items-center justify-center rounded-lg text-sm font-medium
          ${
            status === "present"
              ? "bg-green-500 text-white"
              : status === "absent"
              ? "bg-red-500 text-white"
              : "bg-muted text-muted-foreground"
          }`}
      >
        {day}
      </div>
    );
    if (week.length === 7 || day === daysInMonth) {
      if (day === daysInMonth && week.length < 7) {
        for (let j = week.length; j < 7; j++) {
          week.push(<div key={`empty-end-${j}`} className="h-12" />);
        }
      }
      weeks.push(
        <div key={`week-${day}`} className="grid grid-cols-7 gap-2">
          {week}
        </div>
      );
      week = [];
    }
  }

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };
  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded hover:bg-muted transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold text-lg">
          {monthNames[month - 1]} {year}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded hover:bg-muted transition"
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
    </div>
  );
};

const StudentDashboard = () => {
  const { toast } = useToast();
  const [enrolledClasses, setEnrolledClasses] = useState([
    {
      id: "1",
      name: "Computer Science 101",
      facultyName: "Dr. John Smith",
      attendanceRate: 92,
      mode: "CODE",
    },
    {
      id: "2",
      name: "Database Systems",
      facultyName: "Prof. Jane Doe",
      attendanceRate: 88,
      mode: "LOCATION",
    },
    {
      id: "3",
      name: "Operating Systems",
      facultyName: "Dr. Alan Turing",
      attendanceRate: 75,
      mode: "MANUAL",
    },
  ]);
  const [joinCode, setJoinCode] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [endedClassIds, setEndedClassIds] = useState([]);

  const handleJoinClass = () => {
    if (!joinCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a join code.",
        variant: "destructive",
      });
      return;
    }
    const newClass = {
      id: Date.now().toString(),
      name: "New Course",
      facultyName: "Faculty Member",
      attendanceRate: 0,
      mode: "CODE",
    };
    setEnrolledClasses([...enrolledClasses, newClass]);
    setJoinCode("");
    setIsJoinDialogOpen(false);
    toast({
      title: "Successfully Joined",
      description: "You have been enrolled in the class.",
    });
  };

  const handleViewDetails = (classItem) => {
    setSelectedClass(classItem);
    setDetailsOpen(true);
  };

  const handleCodeSubmit = () => {
    if (selectedClass && enteredCode === "1234") {
      setEndedClassIds((prev) => [...prev, selectedClass.id]);
      toast({
        title: "Attendance Marked",
        description: "Code accepted successfully!",
      });
      toast({
        title: "Class Ended",
        description: `${selectedClass.name} has ended.`,
      });
    } else {
      toast({
        title: "Invalid Code",
        description: "Please check the code and try again.",
        variant: "destructive",
      });
    }
    setEnteredCode("");
    setCodeDialogOpen(false);
  };

  const sampleRecords = {
    1: "present",
    2: "absent",
    3: "present",
    5: "absent",
    6: "present",
    9: "present",
    12: "absent",
    15: "present",
    20: "present",
    25: "absent",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header + Join */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Student Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Your classes and attendance
            </p>
          </div>
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Join Class</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Class</DialogTitle>
                <DialogDescription>
                  Enter the join code provided by your instructor
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="joinCode">Join Code</Label>
                <Input
                  id="joinCode"
                  placeholder="e.g., CS101A"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsJoinDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="default" onClick={handleJoinClass}>
                  Join Class
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classes */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledClasses.map((classItem) => (
              <Card
                key={classItem.id}
                className="shadow-medium hover:shadow-large transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    <Badge variant="secondary">
                      {classItem.attendanceRate}%
                    </Badge>
                  </div>
                  <CardDescription>{classItem.facultyName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Attendance Method */}
                  <div className="space-y-2">
                    {endedClassIds.includes(classItem.id) ? (
                      <div className="p-2 text-center text-muted-foreground border rounded-md font-semibold">
                        Class Ended
                      </div>
                    ) : (
                      <>
                        {classItem.mode === "CODE" && (
                          <Button
                            className="w-full"
                            onClick={() => {
                              setSelectedClass(classItem);
                              setCodeDialogOpen(true);
                            }}
                          >
                            <Code className="h-4 w-4 mr-2" />
                            Enter Code
                          </Button>
                        )}
                        {classItem.mode === "LOCATION" && (
                          <Button
                            className="w-full"
                            onClick={() => {
                              // Handle location check logic here
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                  (position) => {
                                    const { latitude, longitude } =
                                      position.coords;
                                    // Send the location data to the backend for verification
                                    // You'll need to implement the API call to mark attendance with location
                                    toast({
                                      title: "Location Verified",
                                      description: `Your location (${latitude}, ${longitude}) has been recorded.`,
                                    });
                                    setEndedClassIds((prev) => [
                                      ...prev,
                                      classItem.id,
                                    ]);
                                    toast({
                                      title: "Class Ended",
                                      description: `${classItem.name} has ended.`,
                                    });
                                  },
                                  (error) => {
                                    toast({
                                      title: "Location Error",
                                      description: `Error getting location: ${error.message}`,
                                      variant: "destructive",
                                    });
                                  }
                                );
                              } else {
                                toast({
                                  title: "Geolocation Not Supported",
                                  description:
                                    "Geolocation is not supported by your browser.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            Check Location
                          </Button>
                        )}
                        {classItem.mode !== "CODE" &&
                          classItem.mode !== "LOCATION" && (
                            // Render some default/fallback UI if mode is neither CODE nor LOCATION
                            <div className="text-center">
                              Attendance Method Not Specified
                            </div>
                          )}
                      </>
                    )}
                    {classItem.mode === "MANUAL" && (
                      <div className="p-2 text-center text-muted-foreground border rounded-md">
                        <ClipboardList className="inline h-4 w-4 mr-1" />
                        Faculty taking manual attendance
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>50 students</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          classItem.attendanceRate >= 90
                            ? "bg-green-500"
                            : classItem.attendanceRate >= 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span>{classItem.attendanceRate}% rate</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewDetails(classItem)}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl">
            {selectedClass && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedClass.name} - Attendance Records
                  </DialogTitle>
                  <DialogDescription>
                    Red = Absent, Green = Present
                  </DialogDescription>
                </DialogHeader>
                <AttendanceCalendar records={sampleRecords} />
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Enter Code Dialog */}
        <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Attendance Code</DialogTitle>
              <DialogDescription>
                Enter the code provided by your instructor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="attendanceCode">Code</Label>
              <Input
                id="attendanceCode"
                placeholder="e.g., 1234"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setCodeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="default" onClick={handleCodeSubmit}>
                Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentDashboard;
