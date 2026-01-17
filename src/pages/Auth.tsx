import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getRememberPreference, setRememberPreference, transferSessionToSessionStorage } from "@/lib/sessionStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, CreditCard, DollarSign, ArrowRight } from "lucide-react";
import fintLogo from "@/assets/fint-logo-new.png";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { PasswordInput } from "@/components/ui/password-input";
import { EmailInput } from "@/components/ui/email-input";

const REMEMBER_EMAIL_KEY = "fint_remember_email";

type AuthMode = "login" | "register";

// Floating card component for decoration
const FloatingCard = ({ className, rotate = 0, style, children }: { className?: string; rotate?: number; style?: React.CSSProperties; children?: React.ReactNode }) => (
  <div 
    className={`absolute bg-gradient-to-br from-primary/80 to-primary rounded-xl shadow-2xl ${className}`}
    style={{ transform: `rotate(${rotate}deg)`, ...style }}
  >
    {children}
  </div>
);

// Floating coin component
const FloatingCoin = ({ className }: { className?: string }) => (
  <div className={`absolute w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center ${className}`}>
    <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-primary/50" />
  </div>
);

export default function Auth() {
  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get("reset") === "true";
  
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  
  // New password reset states
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load remembered email + session preference on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    const rememberPref = getRememberPreference();

    if (savedEmail) {
      setEmail(savedEmail);
    }

    // Keep UI + stored preference in sync
    const shouldRemember = Boolean(rememberPref || savedEmail);
    setRememberMe(shouldRemember);

    if (shouldRemember && !rememberPref) {
      setRememberPreference(true);
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setUpdateLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });
      navigate("/");
    }
    setUpdateLoading(false);
  };

  // If reset mode, show password update form
  if (isResetMode) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card shadow-2xl animate-scale-in">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src={fintLogo} alt="fint" className="w-10 h-10" />
              <span className="font-display text-xl font-bold">fint</span>
            </div>
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <PasswordInput
                  id="confirm-new-password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateLoading}>
                {updateLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }
      }
    });

    if (error) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "You can now sign in.",
      });
      setAuthMode("login");
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Save session preference
      setRememberPreference(rememberMe);
      
      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        // Move session to sessionStorage so it expires when browser closes
        transferSessionToSessionStorage();
      }
      navigate("/");
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We sent you a password reset link.",
      });
      setResetDialogOpen(false);
      setResetEmail("");
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-primary relative overflow-hidden">
        {/* Logo */}
        <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
          <img src={fintLogo} alt="fint" className="w-12 h-12" />
          <span className="font-display text-2xl font-bold text-primary-foreground">fint</span>
        </div>
        
        {/* Floating decorative elements */}
        {/* Main credit card - top left */}
        <FloatingCard className="w-48 h-28 xl:w-64 xl:h-36 top-[15%] left-[10%] animate-fade-in" rotate={-15}>
          <div className="p-4 h-full flex flex-col justify-between text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 bg-yellow-400 rounded-sm" />
              <div className="w-6 h-6 bg-orange-500/80 rounded-full -ml-3" />
            </div>
            <div className="space-y-1">
              <div className="text-xs tracking-[0.2em] opacity-80">1098 3254 3210</div>
            </div>
          </div>
        </FloatingCard>

        {/* Secondary credit card - bottom */}
        <FloatingCard className="w-52 h-32 xl:w-72 xl:h-40 bottom-[10%] left-[15%] xl:left-[20%] animate-fade-in" rotate={5} style={{ animationDelay: '0.2s' }}>
          <div className="p-4 h-full flex flex-col justify-between text-primary-foreground">
            <CreditCard className="w-8 h-8 opacity-60" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-yellow-400 rounded-sm" />
                <div className="w-5 h-5 bg-orange-500/80 rounded-full -ml-2" />
              </div>
              <div className="text-xs tracking-[0.2em] opacity-80">1098 7654</div>
            </div>
          </div>
        </FloatingCard>

        {/* Floating coins */}
        <FloatingCoin className="top-[8%] right-[15%] animate-fade-in" />
        <FloatingCoin className="bottom-[25%] left-[5%] animate-fade-in" />
        
        {/* Tagline */}
        <div className="absolute top-1/2 left-8 xl:left-12 transform -translate-y-1/2 z-10">
          <h2 className="text-3xl xl:text-4xl font-display font-light text-primary-foreground/70 leading-snug">
            Take control of<br />
            <span className="font-medium text-primary-foreground">your finances</span>
          </h2>
        </div>
        
        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/80 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primary/50 to-transparent pointer-events-none" />
      </div>
      
      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo - only shown on small screens */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src={fintLogo} alt="fint" className="w-10 h-10" />
            <span className="font-display text-xl font-bold">fint</span>
          </div>
          
          <Card className="border-0 shadow-none bg-transparent">
            {authMode === "register" ? (
              <>
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="text-3xl font-display font-bold">Sign up</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="full-name" className="text-sm font-medium text-foreground">Full Name</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          id="first-name"
                          type="text"
                          placeholder="First"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="bg-muted/50 border-0 h-12 rounded-lg focus:ring-2 focus:ring-primary/20"
                        />
                        <Input
                          id="last-name"
                          type="text"
                          placeholder="Last"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="bg-muted/50 border-0 h-12 rounded-lg focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email-register" className="text-sm font-medium text-foreground">Email Address</Label>
                      <EmailInput
                        id="email-register"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onValidChange={setEmailValid}
                        required
                        className="bg-muted/50 border-0 h-12 rounded-lg focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="password-register" className="text-sm font-medium text-foreground">Password</Label>
                        <PasswordInput
                          id="password-register"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="bg-muted/50 border-0 h-12 rounded-lg focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
                        <PasswordInput
                          id="confirm-password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          className="bg-muted/50 border-0 h-12 rounded-lg focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <PasswordStrengthIndicator password={password} />
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium rounded-lg mt-6" 
                      disabled={loading || !emailValid}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-background text-muted-foreground">Or</span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-12 text-base font-medium rounded-lg"
                      onClick={() => setAuthMode("login")}
                    >
                      Log in
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="text-3xl font-display font-bold">Log in</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email-login" className="text-sm font-medium text-foreground">Email Address</Label>
                      <EmailInput
                        id="email-login"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onValidChange={setEmailValid}
                        required
                        className="bg-muted/50 border-0 h-12 rounded-lg focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password-login" className="text-sm font-medium text-foreground">Password</Label>
                      <PasswordInput
                        id="password-login"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-muted/50 border-0 h-12 rounded-lg focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={(checked) => {
                            const next = checked === true;
                            setRememberMe(next);
                            setRememberPreference(next);
                            if (!next) {
                              localStorage.removeItem(REMEMBER_EMAIL_KEY);
                            }
                          }}
                        />
                        <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer text-muted-foreground">
                          Remember me
                        </Label>
                      </div>
                      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="link" className="px-0 h-auto text-sm text-primary">
                            Forgot password?
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                              Enter your email address and we'll send you a link to reset your password.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor="reset-email">Email</Label>
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="you@email.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                              />
                            </div>
                            <Button type="submit" className="w-full" disabled={resetLoading}>
                              {resetLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Send Reset Link
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium rounded-lg group" 
                      disabled={loading || !emailValid}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                    
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-background text-muted-foreground">Or</span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-12 text-base font-medium rounded-lg"
                      onClick={() => setAuthMode("register")}
                    >
                      Create Account
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
