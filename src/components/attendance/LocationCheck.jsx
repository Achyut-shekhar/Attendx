import { useState, useEffect } from "react";
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
import { facultyAPI } from "@/services/api";

const LocationCheck = ({ classId }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState({});
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await facultyAPI.getClassStudents(classId);
        setStudents(data);
        const statusMap = {};
        data.forEach((s) => {
          statusMap[s.user_id] = "Pending";
        });
        setLocationStatus(statusMap);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast({
          title: "Error",
          description: "Failed to fetch students",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchStudents();
  }, [classId, toast]);

  const startLocationCheck = () => {
    setIsChecking(true);
    toast({
      title: "Location Check Started",
      description: "Requesting location from students...",
    });

    // Simulate students responding to location check
    setTimeout(() => {
      const updatedStatus = { ...locationStatus };
      students.forEach((s) => {
        const randomStatus = Math.random();
        if (randomStatus > 0.7) {
          updatedStatus[s.user_id] = "Verified";
        } else if (randomStatus > 0.3) {
          updatedStatus[s.user_id] = "Outside Zone";
        } else {
          updatedStatus[s.user_id] = "Not Responded";
        }
      });
      setLocationStatus(updatedStatus);
      setIsChecking(false);
    }, 3000);
  };

  const getBadgeVariant = (status) => {
    switch (status) {
      case "Verified":
        return "default";
      case "Outside Zone":
        return "secondary";
      case "Not Responded":
        return "destructive";
      case "Pending":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Location Based Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading students...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location Based Attendance</CardTitle>
        <CardDescription>
          Start a location check to mark attendance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-center mb-4">
          <Button onClick={startLocationCheck} disabled={isChecking}>
            {isChecking ? "Checking..." : "Start Location Check"}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.user_id}>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={getBadgeVariant(locationStatus[student.user_id])}
                  >
                    {locationStatus[student.user_id]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LocationCheck;
