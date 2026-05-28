import React, { useState } from "react";
import {
  LogOut,
  User,
  GraduationCap,
  Sun,
  Moon,
  Mail,
  Shield,
  Calendar,
  Trash2,
  AlertTriangle,
  Loader,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/enhanced-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/api/auth";

const Header = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  // Delete account states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePasswordOpen, setDeletePasswordOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Step 1: User clicks "Delete Account" -> show warning confirmation
  const handleDeleteRequest = () => {
    setProfileOpen(false); // Close profile dialog if open
    setDeleteConfirmOpen(true);
  };

  // Step 2: User confirms warning -> show password dialog
  const handleDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeletePassword("");
    setDeletePasswordOpen(true);
  };

  // Step 3: User enters password -> call API to delete
  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);
      await authApi.deleteAccount(user.user_id, deletePassword);

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Clean up and redirect
      setDeletePasswordOpen(false);
      setDeletePassword("");
      logout();
      navigate("/login");
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account. Please check your password.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-soft">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">
              AttendX
            </h1>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="relative"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-slate-600" />
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3"
                >
                  <User className="h-5 w-5" />
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user?.role}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteRequest}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1 sm:space-y-2 pb-2">
            <DialogTitle className="text-lg sm:text-2xl">
              User Profile
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Your account information and details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            {/* User Avatar and Name */}
            <div className="flex flex-col items-center text-center pb-3 sm:pb-4 border-b">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/10 flex items-center justify-center mb-2 sm:mb-3">
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <h3 className="text-base sm:text-xl font-semibold break-words max-w-full px-2">
                {user?.name}
              </h3>
              <Badge variant="secondary" className="mt-1.5 sm:mt-2 text-xs">
                {user?.role}
              </Badge>
            </div>

            {/* User Details */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    Email
                  </p>
                  <p className="text-xs sm:text-sm break-all">
                    {user?.email || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/50">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    User ID
                  </p>
                  <p className="text-xs sm:text-sm font-mono break-all">
                    {user?.user_id || "N/A"}
                  </p>
                </div>
              </div>

              {user?.role === "STUDENT" && user?.roll_number && (
                <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/50">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                      Roll Number
                    </p>
                    <p className="text-xs sm:text-sm font-mono">
                      {user.roll_number}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    Member Since
                  </p>
                  <p className="text-xs sm:text-sm">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2 sm:pt-4 border-t mt-2">
            <Button
              variant="outline"
              onClick={handleDeleteRequest}
              className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
            <Button
              onClick={() => setProfileOpen(false)}
              className="w-full sm:w-auto"
              size="sm"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 1: Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-lg sm:text-xl">
                Delete Your Account?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed space-y-2">
              <span className="block">
                This action is <strong className="text-foreground">permanent and cannot be undone</strong>. 
                All of your data will be permanently deleted, including:
              </span>
              <span className="block pl-2 border-l-2 border-destructive/30 space-y-1">
                <span className="block">• Your profile and account information</span>
                <span className="block">• All class enrollments and records</span>
                <span className="block">• All attendance history</span>
                {user?.role === "FACULTY" && (
                  <span className="block">• All classes you created and their sessions</span>
                )}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel className="h-10 sm:h-11">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-10 sm:h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continue with Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 2: Password Verification Dialog */}
      <Dialog open={deletePasswordOpen} onOpenChange={(open) => {
        if (!isDeleting) {
          setDeletePasswordOpen(open);
          if (!open) setDeletePassword("");
        }
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription className="text-sm">
              Enter your password to permanently delete your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs sm:text-sm text-destructive font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                This will permanently delete your account for <strong>{user?.email}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deletePassword" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="deletePassword"
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isDeleting) {
                    handleDeleteAccount();
                  }
                }}
                className="h-11"
                disabled={isDeleting}
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeletePasswordOpen(false);
                setDeletePassword("");
              }}
              className="h-10 sm:h-11"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deletePassword.trim()}
              className="h-10 sm:h-11"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete My Account
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
