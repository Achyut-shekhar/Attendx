import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AttendanceProvider } from "@/contexts/AttendanceContext";
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
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AttendanceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/faculty-dashboard"
                  element={
                    <ProtectedRoute role="FACULTY">
                      <FacultyDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student-dashboard"
                  element={
                    <ProtectedRoute role="STUDENT">
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance/:classId"
                  element={
                    <ProtectedRoute role="FACULTY">
                      <Attendance />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AttendanceProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
