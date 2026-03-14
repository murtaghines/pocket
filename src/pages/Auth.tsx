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
import pocketLogoWhite from "@/assets/pocket-logo-white.png";
import pocketIcon from "@/assets/pocket-icon.png";

import { StepName } from "@/components/onboarding/StepName";
import { StepEmail } from "@/components/onboarding/StepEmail";
import { StepCountry } from "@/components/onboarding/StepCountry";
import { StepInvestments } from "@/components/onboarding/StepInvestments";
import { StepJointAccount } from "@/components/onboarding/StepJointAccount";
import { StepPassword } from "@/components/onboarding/StepPassword";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/categoryTranslations";

const REMEMBER_EMAIL_KEY = "pocket_remember_email";

type AuthMode = "login" | "register";
type RegisterStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_QUESTIONS: Record<RegisterStep, string> = {
  1: "What's your name?",
  2: "What's your email?",
  3: "Where are you located?",
  4: "Do you invest?",
  5: "Do you share finances?",
  6: "Create your password",
};

const TOTAL_STEPS = 6;

const AUTH_GRADIENT = 'linear-gradient(to right, #3391D0 0%, #176AA2 100%)';

function detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language || 'en';
  const baseLang = browserLang.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.find(l => l.code === baseLang);
  return (supported?.code || 'en') as SupportedLanguage;
}

/* ── Pre-footer CTA + Dark Footer shared across all auth modes ── */
function AuthBottomSections() {
  return (
    <>
      {/* Divider line */}
      <div style={{ background: '#479bd3' }} className="w-full h-px">
        <div className="container max-w-7xl mx-auto px-6 md:px-12">
          <div className="h-px bg-white/20" />
        </div>
      </div>
      {/* Pre-footer CTA — solid blue */}
      <section className="relative overflow-hidden" style={{ background: '#479bd3' }}>
        {/* Decorative cloud */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 opacity-10 pointer-events-none">
          <img src={pocketIcon} alt="" className="w-full h-full object-contain" />
        </div>
        <div className="container max-w-7xl mx-auto px-6 md:px-12 py-24 lg:py-32 relative z-10">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-tight mb-6">
              Take full control of
              <br />
              your finances.
            </h2>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl leading-relaxed">
              See how pocket helps you organize expenses, investments, and savings. Set up in minutes, not hours.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full border-2 border-white text-white font-medium text-base hover:bg-white hover:text-[#479bd3] transition-colors"
            >
              <span>Get started free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Dark footer */}
      <footer style={{ background: '#0A0A0A' }} className="py-16">
        <div className="container max-w-7xl mx-auto px-6 md:px-12">
          {/* Top row */}
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="inline-block">
                <img src={pocketLogoWhite} alt="pocket" className="h-5 w-auto opacity-90" />
              </Link>
            </div>

            {/* Link columns */}
            <div className="flex gap-16 md:gap-24">
              <div>
                <p className="text-sm font-medium text-white mb-4">Product</p>
                <ul className="space-y-3">
                  <li><a href="/#features" className="text-sm text-white/50 hover:text-white/80 transition-colors">Features</a></li>
                  <li><a href="/#how-it-works" className="text-sm text-white/50 hover:text-white/80 transition-colors">How it works</a></li>
                  <li><Link to="/auth?mode=login" className="text-sm text-white/50 hover:text-white/80 transition-colors">Login</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-4">Company</p>
                <ul className="space-y-3">
                  <li><a href="/#contact" className="text-sm text-white/50 hover:text-white/80 transition-colors">Contact</a></li>
                  <li><a href="#" className="text-sm text-white/50 hover:text-white/80 transition-colors">Privacy</a></li>
                  <li><a href="#" className="text-sm text-white/50 hover:text-white/80 transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom copyright */}
          <div className="border-t border-white/10 pt-8">
            <p className="text-sm text-white/40">© 2026 pocket. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
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
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("EUR");
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
        description: t('success.passwordUpdatedDescription'),
      });
      navigate("/dashboard");
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <PasswordInput
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
                  />
                  <PasswordStrengthIndicator password={newPassword} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <PasswordInput
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
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

  const handleSignUp = async () => {
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

    const redirectUrl = `${window.location.origin}/`;

    const allCategories = [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES];
    const localeMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
    };

    const { error, data } = await supabase.auth.signUp({
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
      if (data.user) {
        try {
          await supabase.from('user_preferences').upsert({
            user_id: data.user.id,
            country: country,
            base_currency: currency,
            selected_categories: allCategories,
            language: language,
            locale: localeMap[language] || 'en-US',
            onboarding_completed: true,
            investment_platforms: investmentPlatforms,
            joint_account_names: jointAccountNames,
          });
        } catch (prefError) {
          console.error('Error saving preferences:', prefError);
        }

        // Also update profiles with new fields
        try {
          await supabase.from('profiles').update({
            investment_platforms: investmentPlatforms,
            joint_account_names: jointAccountNames,
          }).eq('user_id', data.user.id);
        } catch (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }
      
      localStorage.setItem('i18nextLng', language);
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      setAuthMode("login");
      setRegisterStep(1);
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
        title: "Error signing in",
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
        return true; // optional
      case 5:
        return true; // optional
      case 6:
        return password.length >= 6 && password === confirmPassword;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (registerStep < TOTAL_STEPS) {
      setRegisterStep((prev) => (prev + 1) as RegisterStep);
    } else {
      handleSignUp();
    }
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
        return <StepInvestments country={country} selectedPlatforms={investmentPlatforms} onPlatformsChange={setInvestmentPlatforms} />;
      case 5:
        return <StepJointAccount jointAccountNames={jointAccountNames} onJointAccountNamesChange={setJointAccountNames} />;
      case 6:
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

            <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 md:p-10 flex flex-col">
              <div className="flex gap-1 mb-6">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < registerStep 
                        ? 'bg-primary' 
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <p className="text-sm text-gray-400 mb-2">
                {registerStep} of {TOTAL_STEPS}
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mb-6 font-display">
                {STEP_QUESTIONS[registerStep]}
              </h2>

              <div className="min-h-0">
                {renderRegisterStep()}
              </div>

              <div className="flex justify-between items-center pt-6 mt-auto border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  ← Back
                </button>

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
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <EmailInput
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onValidChange={setEmailValid}
                  required
                  className="w-full h-14 px-4 text-base text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-14 px-4 text-base text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast({
                      title: "Forgot password?",
                      description: "Please contact support to reset your password.",
                    });
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
