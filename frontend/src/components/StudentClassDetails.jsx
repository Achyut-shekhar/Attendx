import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

const studentAttendanceData = {
    '1': { // classId
        present: [new Date(2025, 8, 15), new Date(2025, 8, 17), new Date(2025, 8, 24)],
        absent: [new Date(2025, 8, 22), new Date(2025, 8, 29)],
    },
    '2': {
        present: [new Date(2025, 8, 16), new Date(2025, 8, 18), new Date(2025, 8, 23)],
        absent: [new Date(2025, 8, 25)],
    }
};

const StudentClassDetails = ({ classItem }) => {
    const [date, setDate] = useState(new Date());
    const attendance = studentAttendanceData[classItem.id] || { present: [], absent: [] };

    const selectedDayStatus = () => {
        if (!date) return "Select a date";
        if (attendance.present.find(d => d.toDateString() === date.toDateString())) {
            return <span className="text-green-500 font-bold">Present</span>;
        }
        if (attendance.absent.find(d => d.toDateString() === date.toDateString())) {
            return <span className="text-red-500 font-bold">Absent</span>;
        }
        return "No record";
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        modifiers={{
                            present: attendance.present,
                            absent: attendance.absent,
                        }}
                        modifiersClassNames={{
                            present: 'day-present',
                            absent: 'day-absent',
                        }}
                        className="rounded-md border"
                    />
                </div>
                <div>
                    <h3 className="text-lg font-bold mb-4">Details</h3>
                    <div className="p-4 bg-muted rounded-lg">
                        <p>Date: <strong>{date ? date.toLocaleDateString() : 'N/A'}</strong></p>
                        <p>Status: {selectedDayStatus()}</p>
                    </div>
                    <div className="flex space-x-4 mt-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span>Present</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <span>Absent</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentClassDetails;