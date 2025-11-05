import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const { login, user, isLoading } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "STUDENT", // Default role
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    const success = await login(
      formData.email,
      formData.password,
      formData.role
    );
    if (!success) {
      setError(
        'Invalid credentials. Use faculty@school.edu or student@school.edu with password "password"'
      );
      toast({
        title: "Login Failed",
        description:
          "Please use faculty@school.edu or student@school.edu with password 'password'",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    }
  };

  const handleDemoLogin = (role) => {
    const demoCredentials = {
      FACULTY: {
        email: "faculty@school.edu",
        password: "password",
        role: "FACULTY",
      },
      STUDENT: {
        email: "student@school.edu",
        password: "password",
        role: "STUDENT",
      },
    };

    setFormData(demoCredentials[role]);
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-large">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">EduAttend</CardTitle>
            <CardDescription className="text-lg">
              Attendance Management System
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <RadioGroup
                    defaultValue={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="STUDENT" id="student" />
                      <Label htmlFor="student">Student</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FACULTY" id="faculty" />
                      <Label htmlFor="faculty">Faculty</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Demo Accounts
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin("FACULTY")}
                  className="text-xs"
                >
                  Faculty Demo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin("STUDENT")}
                  className="text-xs"
                >
                  Student Demo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
