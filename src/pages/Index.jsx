import { Navigate } from "react-router-dom";
import {
  GraduationCap,
  Users,
  Calendar,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/enhanced-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const Index = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // Redirect authenticated users to their dashboard
  if (user) {
    return (
      <Navigate
        to={
          user.role === "FACULTY" ? "/faculty-dashboard" : "/student-dashboard"
        }
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      {/* Header */}
      <header className="bg-card/10 backdrop-blur-sm border-b border-primary-foreground/20">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground">
              AttendX
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              asChild
              className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <a href="/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 sm:mb-6">
              Modern Attendance
              <br />
              <span className="bg-gradient-to-r from-primary-glow to-primary-foreground bg-clip-text text-transparent">
                Management System
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-primary-foreground/80 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Streamline attendance tracking for educational institutions with
              real-time sessions, automated reporting, and seamless
              student-faculty interaction.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 px-4">
              <Button
                variant="outline"
                size="lg"
                asChild
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 w-full sm:w-auto"
              >
                <a href="/login">Get Started</a>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 w-full sm:w-auto"
              >
                Learn More
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto px-4">
              <Card className="bg-card/10 backdrop-blur-sm border-primary-foreground/20">
                <CardHeader className="text-center">
                  <Users className="h-12 w-12 text-primary-foreground mx-auto mb-4" />
                  <CardTitle className="text-primary-foreground">
                    Faculty Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-primary-foreground/70">
                    Create classes, generate join codes, and manage attendance
                    sessions with real-time monitoring.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card/10 backdrop-blur-sm border-primary-foreground/20">
                <CardHeader className="text-center">
                  <Calendar className="h-12 w-12 text-primary-foreground mx-auto mb-4" />
                  <CardTitle className="text-primary-foreground">
                    Smart Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-primary-foreground/70">
                    Code-based attendance marking with time-limited sessions and
                    automatic record keeping.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card/10 backdrop-blur-sm border-primary-foreground/20">
                <CardHeader className="text-center">
                  <BookOpen className="h-12 w-12 text-primary-foreground mx-auto mb-4" />
                  <CardTitle className="text-primary-foreground">
                    Student Portal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-primary-foreground/70">
                    Easy class enrollment, attendance tracking, and real-time
                    notifications for students.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card/10 backdrop-blur-sm border-t border-primary-foreground/20 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary-foreground/60">
            © 2024 AttendX. Built for modern educational institutions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
