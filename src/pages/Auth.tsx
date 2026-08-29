import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getRememberPreference, setRememberPreference, transferSessionToSessionStorage } from "@/lib/sessionStorage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, ArrowRight } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { PasswordInput } from "@/components/ui/password-input";
import { EmailInput } from "@/components/ui/email-input";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

import { StepName } from "@/components/onboarding/StepName";
import { StepEmail } from "@/components/onboarding/StepEmail";
import { StepCountry } from "@/components/onboarding/StepCountry";
import { StepAccounts } from "@/components/onboarding/StepAccounts";
import { StepInvestments } from "@/components/onboarding/StepInvestments";
import { StepJointAccount } from "@/components/onboarding/StepJointAccount";
import { StepPassword } from "@/components/onboarding/StepPassword";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";


const REMEMBER_EMAIL_KEY = "pocket_remember_email";

type AuthMode = "login" | "register";
type RegisterStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_QUESTIONS: Record<RegisterStep, string> = {
  1: "What's your name?",
  2: "What's your email?",
  3: "Where are you located?",
  4: "Which banks do you use?",
  5: "Do you invest?",
  6: "Do you share finances?",
  7: "Create your password",
};

// One-line rationale shown under each question so the user understands why we ask.
const STEP_WHY: Record<RegisterStep, string> = {
  1: "So we can personalize your experience.",
  2: "This is how you'll sign in.",
  3: "To read your amounts, dates and decimals correctly.",
  4: "We'll recognize your statements and set up your accounts automatically.",
  5: "To read your investment movements. You can skip this.",
  6: "To handle joint accounts and split shared expenses. You can skip this.",
  7: "Keep your account secure.",
};

// Steps the user can skip without entering anything.
const OPTIONAL_STEPS: RegisterStep[] = [4, 5, 6];

const TOTAL_STEPS = 7;

const AUTH_GRADIENT = 'linear-gradient(to right, hsl(216 100% 55%) 0%, hsl(216 100% 42%) 100%)';

function detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language || 'en';
  const baseLang = browserLang.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.find(l => l.code === baseLang);
  return (supported?.code || 'en') as SupportedLanguage;
}

/* ── Footer shared across all auth modes — reuses landing footer ── */
function AuthBottomSections() {
  return <LandingFooter />;
}

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isResetMode = searchParams.get("reset") === "true";
  const modeFromUrl = searchParams.get("mode") === "login" ? "login" : "register";
  const { t } = useTranslation('auth');
  
  const [authMode, setAuthModeState] = useState<AuthMode>(modeFromUrl);
  
  const setAuthMode = (mode: AuthMode) => {
    setAuthModeState(mode);
    if (mode === "login") {
      setSearchParams({ mode: "login" });
    } else {
      setSearchParams({});
    }
  };
  
  useEffect(() => {
    setAuthModeState(modeFromUrl);
  }, [modeFromUrl]);

  // Detect Supabase password recovery event and force the reset screen
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSearchParams({ reset: "true" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [setSearchParams]);
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [bankNames, setBankNames] = useState<string[]>([]);
  const [investmentPlatforms, setInvestmentPlatforms] = useState<string[]>([]);
  const [jointAccountNames, setJointAccountNames] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language] = useState(detectBrowserLanguage());
  
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  
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
        title: t('errors.title'),
        description: t('errors.passwordMismatch'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('errors.title'),
        description: t('errors.passwordTooShort'),
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
        title: t('errors.title'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('success.passwordUpdated'),
        description: "Please sign in with your new password.",
      });
      await supabase.auth.signOut();
      navigate("/auth?mode=login");
    }
    setUpdateLoading(false);
  };

  // Password Reset Mode
  if (isResetMode) {
    return (
      <div className="flex flex-col">
        <div className="min-h-screen relative" style={{ background: AUTH_GRADIENT }}>
          <LandingHeader />
          
          <div className="min-h-screen pt-24 pb-20 px-4 flex flex-col items-center justify-center">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-display">
                Set New Password
              </h1>
              <p className="text-lg text-white/70 max-w-md mx-auto">
                Enter your new password below
              </p>
            </div>

            <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 md:p-10">
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-primary/10 rounded-full">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground/70 mb-2">New Password</label>
                  <PasswordInput
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-14 px-4 text-base text-foreground bg-white border-2 border-border rounded-xl focus:border-foreground focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
                  />
                  <PasswordStrengthIndicator password={newPassword} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground/70 mb-2">Confirm Password</label>
                  <PasswordInput
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-14 px-4 text-base text-foreground bg-white border-2 border-border rounded-xl focus:border-foreground focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
                  />
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={updateLoading}
                    className="h-12 px-8 text-base font-medium bg-primary hover:bg-primary/90 text-white rounded-xl"
                  >
                    {updateLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update Password
                  </Button>
                </div>
              </form>
            </div>

            <p className="text-center mt-8 text-white/80">
              <button 
                onClick={() => navigate("/auth")}
                className="text-white font-medium underline underline-offset-4 hover:no-underline"
              >
                ← Back to Sign In
              </button>
            </p>
          </div>
        </div>
        <AuthBottomSections />
      </div>
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const finalizeSignUp = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
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

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (signUpError) {
      toast({
        title: "Couldn't create your account",
        description: signUpError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // If session not returned (e.g. email confirm required), try to sign in directly
    let userId = signUpData.user?.id;
    if (!signUpData.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) {
        toast({
          title: "Account created",
          description: "Please log in to continue.",
        });
        setAuthMode("login");
        setLoading(false);
        return;
      }
      userId = signInData.user?.id || userId;
    }

    if (userId) {
      try {
        await supabase.from('user_preferences').upsert({
          user_id: userId,
          country,
          base_currency: currency,
          language,
          // Signup collects config only; the behavior questions run once inside
          // the dashboard, so leave this false to trigger that onboarding.
          onboarding_completed: false,
          joint_account_names: jointAccountNames,
        });
      } catch (prefError) {
        console.error('Error saving preferences:', prefError);
      }

      try {
        // joint_account_names lives in user_preferences
        // (single source of truth); profiles only holds identity fields.
        await supabase.from('profiles').upsert({
          user_id: userId,
          email: normalizedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }, { onConflict: 'user_id' });
      } catch (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Pre-create the accounts for the banks the user named, so their first
      // statement upload maps to a real account.
      if (bankNames.length > 0) {
        try {
          await supabase.from('accounts').insert(
            bankNames.map((name, i) => ({
              user_id: userId,
              name,
              institution: name,
              account_role: 'CASH' as const,
              domain_default: 'CASHFLOW' as const,
              currency_base: currency,
              is_primary: i === 0,
            }))
          );
        } catch (accountError) {
          console.error('Error creating accounts:', accountError);
        }
      }
    }

    localStorage.setItem('i18nextLng', language);
    setRememberPreference(true);

    toast({
      title: "Welcome to pocket!",
      description: "Your account is ready.",
    });
    navigate("/dashboard");
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const isInvalidCreds = /invalid.*credentials/i.test(error.message);
      toast({
        title: "Couldn't sign in",
        description: isInvalidCreds
          ? "Wrong email or password. If you just signed up, make sure you finished creating your password."
          : error.message,
        variant: "destructive",
      });
    } else {
      setRememberPreference(rememberMe);

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        transferSessionToSessionStorage();
      }
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const canProceedStep = (): boolean => {
    switch (registerStep) {
      case 1:
        return firstName.trim().length > 0;
      case 2:
        return emailValid;
      case 3:
        return country.length > 0 && currency.length > 0;
      case 4:
        return true; // banks — optional
      case 5:
        return true; // investments — optional
      case 6:
        return true; // shared finances — optional
      case 7:
        return password.length >= 6 && password === confirmPassword;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (registerStep === TOTAL_STEPS) {
      await finalizeSignUp();
      return;
    }
    setRegisterStep((prev) => (prev + 1) as RegisterStep);
  };

  const handleBack = () => {
    if (registerStep > 1) {
      setRegisterStep((prev) => (prev - 1) as RegisterStep);
    } else {
      setAuthMode("login");
    }
  };

  const renderRegisterStep = () => {
    switch (registerStep) {
      case 1:
        return <StepName firstName={firstName} lastName={lastName} onFirstNameChange={setFirstName} onLastNameChange={setLastName} />;
      case 2:
        return <StepEmail email={email} onEmailChange={setEmail} onValidChange={setEmailValid} />;
      case 3:
        return <StepCountry country={country} currency={currency} onCountryChange={setCountry} onCurrencyChange={setCurrency} />;
      case 4:
        return <StepAccounts accountNames={bankNames} onAccountNamesChange={setBankNames} />;
      case 5:
        return <StepInvestments country={country} selectedPlatforms={investmentPlatforms} onPlatformsChange={setInvestmentPlatforms} />;
      case 6:
        return <StepJointAccount jointAccountNames={jointAccountNames} onJointAccountNamesChange={setJointAccountNames} />;
      case 7:
        return (
          <StepPassword
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
          />
        );
      default:
        return null;
    }
  };

  // REGISTER MODE
  if (authMode === "register") {
    return (
      <div className="flex flex-col">
        <div className="min-h-screen relative" style={{ background: AUTH_GRADIENT }}>
          <LandingHeader />
          
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-display">
                Get Started
              </h1>
              <p className="text-lg text-white/70 max-w-md mx-auto">
                Set up your pocket account in just a few steps
              </p>
            </div>

            <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 md:p-10 flex flex-col min-h-[460px] h-auto md:h-[460px]">
              <div className="flex gap-1 mb-6">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < registerStep 
                        ? 'bg-primary' 
                        : 'bg-border'
                    }`}
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                {registerStep} of {TOTAL_STEPS}
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-1">
                {STEP_QUESTIONS[registerStep]}
              </h2>
              <p className="text-sm text-muted-foreground mb-5">{STEP_WHY[registerStep]}</p>

              <div className="flex-1 overflow-y-auto min-h-0">
                {renderRegisterStep()}
              </div>

              <div className="flex justify-between items-center pt-6 mt-auto border-t border-border">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                  >
                    ← Back
                  </button>
                  {OPTIONAL_STEPS.includes(registerStep) && (
                    <button
                      type="button"
                      onClick={() => setRegisterStep((prev) => (prev + 1) as RegisterStep)}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      Skip
                    </button>
                  )}
                </div>

                <Button 
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceedStep() || loading}
                  className="h-12 px-8 text-base font-medium bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : registerStep === TOTAL_STEPS ? (
                    "Create Account"
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-center mt-8 text-white/80">
              Already have an account?{' '}
              <button 
                onClick={() => setAuthMode("login")}
                className="text-white font-medium underline underline-offset-4 hover:no-underline"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
        <AuthBottomSections />
      </div>
    );
  }

  // LOGIN MODE
  return (
    <div className="flex flex-col">
      <div className="min-h-screen relative" style={{ background: AUTH_GRADIENT }}>
        <LandingHeader />
        
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-display">
              Welcome back
            </h1>
            <p className="text-lg text-white/70 max-w-md mx-auto">
              Sign in to continue to pocket
            </p>
          </div>

          <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 md:p-10 flex flex-col" style={{ height: '460px' }}>
            <form onSubmit={handleSignIn} className="space-y-6 flex-1 flex flex-col">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">Email</label>
                <EmailInput
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onValidChange={setEmailValid}
                  required
                  className="w-full h-14 px-4 text-base text-foreground bg-white border border-border rounded-xl focus:border-foreground/30 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-14 px-4 text-base text-foreground bg-white border border-border rounded-xl focus:border-foreground/30 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                  />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!emailValid || !normalizedEmail) {
                      toast({
                        title: "Enter your email first",
                        description: "Type your email above so we can send you a reset link.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                      redirectTo: `${window.location.origin}/auth?reset=true`,
                    });
                    if (error) {
                      toast({
                        title: "Couldn't send reset email",
                        description: error.message,
                        variant: "destructive",
                      });
                    } else {
                      toast({
                        title: "Check your email",
                        description: `We sent a password reset link to ${normalizedEmail}.`,
                      });
                    }
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              
              <div className="flex justify-end pt-4 mt-auto">
                <Button 
                  type="submit" 
                  disabled={loading || !emailValid}
                  className="h-12 px-8 text-base font-medium bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Log in"
                  )}
                </Button>
              </div>
            </form>
          </div>

          <p className="text-center mt-8 text-white/80">
            Don't have an account?{' '}
            <button 
              onClick={() => setAuthMode("register")}
              className="text-white font-medium underline underline-offset-4 hover:no-underline"
            >
              Get started
            </button>
          </p>
        </div>
      </div>
      <AuthBottomSections />
    </div>
  );
}
