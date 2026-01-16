import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { login, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
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

  // Handle login & redirect
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const success = await login(formData.email, formData.password);

      if (success) {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in",
        });

        // Navigation will be handled by AuthContext based on user role
      } else {
        setError("Invalid email or password");
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Login error (frontend):", err);
      setError("Could not connect to backend");
      toast({
        title: "Connection Error",
        description: "Could not reach backend API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-6 sm:p-4 overflow-hidden relative">
      {/* Animated Background Orbs - Smaller on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-48 h-48 sm:w-96 sm:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-48 h-48 sm:w-96 sm:h-96 bg-primary/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Decorative Elements - Hidden on very small screens */}
      <div className="hidden sm:block absolute top-10 left-10 w-20 h-20 border border-primary/20 rounded-full opacity-50 animate-float" />
      <div className="hidden sm:block absolute bottom-20 right-20 w-16 h-16 border border-primary/15 rounded-full opacity-50 animate-float delay-500" />
      <div className="hidden sm:block absolute top-1/4 right-1/4 w-8 h-8 bg-primary/10 rounded-full animate-pulse" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Brand */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 mb-3 sm:mb-4 group hover:scale-110 transition-transform duration-300">
            <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-primary group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-1 sm:mb-2">
            Welcome Back
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sign in to continue to{" "}
            <span className="text-primary font-semibold">AttendX</span>
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-2 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <CardDescription className="text-center text-xs sm:text-sm">
                Attendance Management System
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <Alert
                  variant="destructive"
                  className="animate-in fade-in slide-in-from-top-2 duration-300 text-sm"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3 sm:space-y-4">
                {/* Email input */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs sm:text-sm font-medium"
                  >
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="pl-10 h-11 sm:h-12 text-sm sm:text-base bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password input */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs sm:text-sm font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password: e.target.value,
                        })
                      }
                      className="pl-10 pr-10 h-11 sm:h-12 text-sm sm:text-base bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] sm:hover:scale-[1.02] transition-all duration-300 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    New here?
                  </span>
                </div>
              </div>

              {/* Register Link */}
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/register")}
                className="w-full h-11 sm:h-12 text-sm sm:text-base rounded-xl border-border/50 hover:bg-primary/5 hover:border-primary/30 active:scale-[0.98] transition-all"
              >
                Create an Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
