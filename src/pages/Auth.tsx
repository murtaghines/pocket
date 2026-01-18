import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getRememberPreference, setRememberPreference, transferSessionToSessionStorage } from "@/lib/sessionStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, KeyRound } from "lucide-react";
import fintIcon from "@/assets/fint-icon.png";
import fintTextWhite from "@/assets/fint-text-white.png";
import authBackground from "@/assets/auth-background.png";
import coinImage from "@/assets/coin.png";
import creditCard1 from "@/assets/credit-card-1.png";
import creditCard2 from "@/assets/credit-card-2.png";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { PasswordInput } from "@/components/ui/password-input";
import { EmailInput } from "@/components/ui/email-input";

const REMEMBER_EMAIL_KEY = "fint_remember_email";

type AuthMode = "login" | "register";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get("reset") === "true";
  
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    const rememberPref = getRememberPreference();

    if (savedEmail) {
      setEmail(savedEmail);
    }

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

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-2xl rounded-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={fintIcon} alt="fint" className="w-10 h-10" />
              <span className="font-display text-xl font-bold text-primary">fint</span>
            </div>
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle>Set New Password</CardTitle>
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

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
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
      setRememberPreference(rememberMe);
      
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
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
    <div 
      className="w-full relative overflow-x-hidden flex items-center justify-center p-4 lg:p-8"
      style={{ 
        minHeight: 'max(100vh, 100dvh)',
        backgroundColor: 'hsl(229, 100%, 66%)'
      }}
    >
      {/* Background image - covers everything including Safari bars */}
      <div 
        className="fixed inset-0 w-full bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${authBackground})`,
          height: 'max(100vh, 100dvh)'
        }}
      />
      
      {/* Extra background color to prevent white gaps */}
      <div 
        className="fixed inset-0 w-full -z-10"
        style={{ 
          backgroundColor: 'hsl(229, 100%, 66%)',
          height: '200vh'
        }}
      />
      
      {/* Logo text - top left */}
      <div className="fixed top-6 left-6 lg:top-8 lg:left-10 z-20">
        <img src={fintTextWhite} alt="fint" className="h-6 lg:h-8 w-auto" />
      </div>
      
      {/* Floating coin - top right */}
      <img 
        src={coinImage} 
        alt="" 
        className="fixed top-6 right-6 lg:top-10 lg:right-16 w-20 h-20 lg:w-32 lg:h-32 object-contain z-10 animate-float-fast"
      />
      
      {/* Floating coin - bottom left */}
      <img 
        src={coinImage} 
        alt="" 
        className="fixed bottom-[12%] left-[3%] w-28 h-28 lg:w-44 lg:h-44 object-contain z-10 animate-float-medium"
        style={{ animationDelay: '1s' }}
      />
      
      {/* Credit Card 1 - Top Left */}
      <img 
        src={creditCard1} 
        alt="" 
        className="fixed top-[6%] left-[1%] lg:left-[3%] w-52 lg:w-80 object-contain z-10 animate-float-slow"
      />
      
      {/* Credit Card 2 - Bottom Center */}
      <img 
        src={creditCard2} 
        alt="" 
        className="fixed bottom-[2%] left-[10%] lg:left-[15%] w-60 lg:w-96 object-contain z-10 animate-float-slow"
        style={{ animationDelay: '2s' }}
      />
      
      {/* Tagline */}
      <div className="fixed top-1/2 left-6 lg:left-[8%] -translate-y-1/2 z-10 hidden sm:block">
        <p className="text-white/60 text-2xl lg:text-3xl xl:text-4xl font-light leading-relaxed">
          Take control of<br />
          <span className="text-white/90 font-medium">your finances</span>
        </p>
      </div>
      
      {/* Form Card - FIXED HEIGHT for both login and signup */}
      <Card className="relative z-20 w-full max-w-md lg:max-w-lg bg-white rounded-3xl shadow-2xl ml-auto lg:mr-[5%] xl:mr-[8%] min-h-[580px] h-[580px] flex flex-col overflow-hidden">
        {authMode === "register" ? (
          <>
            <CardHeader className="pb-2 pt-8 px-8 flex-shrink-0">
              <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900">Sign up</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 flex-1 overflow-y-auto">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full-name" className="text-sm font-medium text-gray-700">Full Name</Label>
                  <Input
                    id="full-name"
                    type="text"
                    placeholder="Daniel Gallego"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email-register" className="text-sm font-medium text-gray-700">Email Address</Label>
                  <EmailInput
                    id="email-register"
                    placeholder="hello@reallygreatsite.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onValidChange={setEmailValid}
                    required
                    className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password-register" className="text-sm font-medium text-gray-700">Password</Label>
                    <PasswordInput
                      id="password-register"
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                    <PasswordInput
                      id="confirm-password"
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <PasswordStrengthIndicator password={password} />
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 mt-4" 
                  disabled={loading || !emailValid}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                </Button>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400">Or</span>
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-12 text-base font-medium rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={() => setAuthMode("login")}
                >
                  Log in
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="pb-2 pt-8 px-8 flex-shrink-0">
              <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900">Log in</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 flex-1 flex flex-col justify-center">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-login" className="text-sm font-medium text-gray-700">Email Address</Label>
                  <EmailInput
                    id="email-login"
                    placeholder="hello@reallygreatsite.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onValidChange={setEmailValid}
                    required
                    className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password-login" className="text-sm font-medium text-gray-700">Password</Label>
                  <PasswordInput
                    id="password-login"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
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
                    <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer text-gray-500">
                      Remember me
                    </Label>
                  </div>
                  <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="px-0 h-auto text-sm text-[hsl(var(--primary))]">
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
                  className="w-full h-12 text-base font-medium rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 group" 
                  disabled={loading || !emailValid}
                >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400">Or</span>
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-12 text-base font-medium rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50"
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
  );
}
