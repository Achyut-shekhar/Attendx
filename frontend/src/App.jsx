import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AttendanceProvider } from "@/contexts/AttendanceContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import FacultyDashboard from "@/pages/FacultyDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Attendance from "@/pages/Attendance";
import Register from "@/pages/Register";

const queryClient = new QueryClient();

const App = () => (
  // ✅ BrowserRouter moved to the top (this is important)
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AttendanceProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Faculty route */}
                  <Route
                    path="/faculty-dashboard"
                    element={
                      <ProtectedRoute role="FACULTY">
                        <FacultyDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Student route */}
                  <Route
                    path="/student-dashboard"
                    element={
                      <ProtectedRoute role="STUDENT">
                        <StudentDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Attendance route */}
                  <Route
                    path="/attendance/:classId"
                    element={
                      <ProtectedRoute role="FACULTY">
                        <Attendance />
                      </ProtectedRoute>
                    }
                  />

                  {/* If page not found */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </AttendanceProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
