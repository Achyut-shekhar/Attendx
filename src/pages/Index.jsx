import { Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  GraduationCap,
  Users,
  Calendar,
  BookOpen,
  Sun,
  Moon,
  CheckCircle,
  Zap,
  Shield,
  MapPin,
  ArrowRight,
  Sparkles,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/enhanced-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

// Hook for scroll animations
const useScrollAnimation = () => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -100px 0px" },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

// Animated section wrapper with more dramatic animations
const AnimatedSection = ({
  children,
  className = "",
  delay = 0,
  direction = "up",
}) => {
  const { ref, isVisible } = useScrollAnimation();

  const getTransform = () => {
    if (isVisible) return "translate-y-0 translate-x-0 scale-100";
    switch (direction) {
      case "left":
        return "translate-x-[-50px] opacity-0";
      case "right":
        return "translate-x-[50px] opacity-0";
      case "scale":
        return "scale-90 opacity-0";
      default:
        return "translate-y-[60px] opacity-0";
    }
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${className} ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        transitionDelay: `${delay}ms`,
        transform: isVisible
          ? "translateY(0) translateX(0) scale(1)"
          : direction === "left"
            ? "translateX(-50px)"
            : direction === "right"
              ? "translateX(50px)"
              : direction === "scale"
                ? "scale(0.9)"
                : "translateY(60px)",
      }}
    >
      {children}
    </div>
  );
};

const Index = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [showDemoVideo, setShowDemoVideo] = useState(false);

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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Header */}
      <header className="z-10 bg-background/80 backdrop-blur-md border-b border-border sticky top-0">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary rounded-xl">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              AttendX
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button variant="outline" asChild className="hidden sm:flex">
              <a href="/login">Sign In</a>
            </Button>
            <Button asChild>
              <a href="/login" className="flex items-center gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex items-center py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              <span>Trusted by 150+ users</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Attendance Made
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Simple & Smart
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform your classroom attendance with real-time tracking,
              location verification, and instant analytics. Built for modern
              education.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <a href="/login" className="flex items-center gap-2">
                  Start Free Trial <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 rounded-xl"
                onClick={() => setShowDemoVideo(true)}
              >
                <Play className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>

              {/* Demo Video Dialog */}
              <Dialog open={showDemoVideo} onOpenChange={setShowDemoVideo}>
                <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
                  <DialogHeader className="p-4 pb-0">
                    <DialogTitle>AttendX Demo</DialogTitle>
                  </DialogHeader>
                  <div className="aspect-video w-full">
                    <iframe
                      className="w-full h-full"
                      src="https://youtu.be/NmcK22WJIDk?si=vul6Lp75ydyJiiTn"
                      title="AttendX Demo Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to simplify attendance management for
              both faculty and students.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Users,
                title: "Class Management",
                description:
                  "Create classes, generate unique join codes, and manage student enrollments effortlessly.",
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                icon: Zap,
                title: "Real-time Sessions",
                description:
                  "Start attendance sessions instantly with auto-generated codes and live tracking.",
                color: "text-yellow-500",
                bg: "bg-yellow-500/10",
              },
              {
                icon: MapPin,
                title: "Location Verification",
                description:
                  "Ensure students are physically present with GPS-based attendance verification.",
                color: "text-green-500",
                bg: "bg-green-500/10",
              },
              {
                icon: Calendar,
                title: "Smart Analytics",
                description:
                  "Track attendance patterns with detailed reports and exportable data.",
                color: "text-purple-500",
                bg: "bg-purple-500/10",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description:
                  "Enterprise-grade security with encrypted data and privacy-first design.",
                color: "text-red-500",
                bg: "bg-red-500/10",
              },
              {
                icon: BookOpen,
                title: "Student Portal",
                description:
                  "Easy class enrollment, attendance history, and real-time notifications.",
                color: "text-indigo-500",
                bg: "bg-indigo-500/10",
              },
            ].map((feature, i) => (
              <AnimatedSection
                key={i}
                delay={i * 150}
                direction={
                  i % 3 === 0 ? "left" : i % 3 === 1 ? "scale" : "right"
                }
              >
                <Card className="group h-full border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-2">
                  <CardHeader>
                    <div
                      className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <feature.icon className={`h-7 w-7 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Create Your Class",
                description:
                  "Set up your class and share the unique join code with your students.",
              },
              {
                step: "02",
                title: "Start a Session",
                description:
                  "Begin an attendance session with one click. Students get notified instantly.",
              },
              {
                step: "03",
                title: "Track & Export",
                description:
                  "View real-time attendance and export detailed reports anytime.",
              },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 200} direction="scale">
                <div className="relative text-center p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-all duration-300 hover:border-primary/30">
                  <div className="text-6xl font-bold bg-gradient-to-b from-primary to-primary/40 bg-clip-text text-transparent mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.description}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-6 -translate-y-1/2 text-primary">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <div className="max-w-4xl mx-auto text-center relative overflow-hidden bg-card border border-border rounded-3xl p-10 sm:p-16 shadow-xl">
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-primary/15 rounded-full blur-3xl animate-pulse delay-500" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
              </div>

              {/* Decorative rings */}
              <div className="absolute top-6 right-6 w-20 h-20 border border-primary/20 rounded-full opacity-50" />
              <div className="absolute bottom-6 left-6 w-16 h-16 border border-primary/15 rounded-full opacity-50" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  <span>Start for free</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Ready to Transform Your Attendance?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                  Join thousands of educators already using AttendX to save time
                  and improve accuracy.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    asChild
                    className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                  >
                    <a href="/login" className="flex items-center gap-2">
                      Get Started Free <ArrowRight className="h-5 w-5" />
                    </a>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-muted-foreground text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Free forever plan</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-muted/30 border-t border-border py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary rounded-xl">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">AttendX</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2026 AttendX. Built for modern educational institutions.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <span>Contact: achyutshekhar54@gmail.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
