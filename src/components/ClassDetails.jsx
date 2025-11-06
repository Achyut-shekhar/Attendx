import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const [dailyData, setDailyData] = useState(null);

  const selectedDate = date.toISOString().split("T")[0];

  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await facultyAPI.getClassDetails(classItem.class_id);
        setAllAttendanceRecords(data || []);

        // Process data for selected date
        processDateData(data, selectedDate);
      } catch (error) {
        setError(error.message || "Failed to load class details");
        toast({
          title: "Error",
          description: error.message || "Failed to load class details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetails();
  }, [classItem.class_id, toast]);

  // Update daily data when date changes
  useEffect(() => {
    if (allAttendanceRecords.length > 0) {
      processDateData(allAttendanceRecords, selectedDate);
    }
  }, [selectedDate, allAttendanceRecords]);

  const processDateData = (records, dateStr) => {
    // Filter records for the selected date
    const dateRecords = records.filter((record) => {
      if (!record.marked_at) return false;
      const recordDate = new Date(record.marked_at).toISOString().split("T")[0];
      return recordDate === dateStr;
    });

    if (dateRecords.length === 0) {
      setDailyData(null);
      return;
    }

    // Count present and absent
    const presentCount = dateRecords.filter(
      (r) => r.attendance_status === "PRESENT"
    ).length;
    const absentCount = dateRecords.filter(
      (r) => !r.attendance_status || r.attendance_status !== "PRESENT"
    ).length;

    // Prepare absentee list
    const absentees = dateRecords
      .filter((r) => !r.attendance_status || r.attendance_status !== "PRESENT")
      .map((r, idx) => ({
        id: idx,
        name: r.student_name || "Unknown",
      }));

    setDailyData({
      presentCount,
      absentCount,
      absentees,
      allRecords: dateRecords,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center min-h-[300px]">{error}</div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {classItem.class_name} - Attendance Details
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 flex justify-center">
          <div className="max-w-xs">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Attendance for {selectedDate}</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600">Present</p>
                      <p className="text-2xl font-bold text-green-700">
                        {dailyData.presentCount}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">Absent</p>
                      <p className="text-2xl font-bold text-red-700">
                        {dailyData.absentCount}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Records Table */}
                  <div className="mt-6">
                    <h3 className="font-bold mb-3">Attendance Records</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Marked At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyData.allRecords.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {record.student_name || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.attendance_status === "PRESENT"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {record.attendance_status || "ABSENT"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(record.marked_at).toLocaleTimeString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Absentees List */}
                  {dailyData.absentCount > 0 && (
                    <div>
                      <h3 className="font-bold mt-4">Absentees:</h3>
                      <ul className="mt-2 space-y-1">
                        {dailyData.absentees.map((student) => (
                          <li
                            key={student.id}
                            className="flex items-center space-x-2 text-sm text-red-600"
                          >
                            <span>•</span>
                            <span>{student.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  No attendance data for this date.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClassDetails;
