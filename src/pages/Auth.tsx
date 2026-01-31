import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getRememberPreference, setRememberPreference, transferSessionToSessionStorage } from "@/lib/sessionStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";
import fintTextWhite from "@/assets/fint-text-white.png";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { PasswordInput } from "@/components/ui/password-input";
import { EmailInput } from "@/components/ui/email-input";
import { StepLanguage } from "@/components/onboarding/StepLanguage";
import { StepCountry } from "@/components/onboarding/StepCountry";
import { StepCurrency } from "@/components/onboarding/StepCurrency";
import { StepCategories } from "@/components/onboarding/StepCategories";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/categoryTranslations";

const REMEMBER_EMAIL_KEY = "fint_remember_email";

type AuthMode = "login" | "register";
type RegisterStep = 1 | 2 | 3 | 4 | 5; // 1-4 onboarding, 5 create account

interface OnboardingData {
  country: string;
  currency: string;
  categories: string[];
  incomeCategories: string[];
  expenseCategories: string[];
  language: string;
}

function detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language || 'en';
  const baseLang = browserLang.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.find(l => l.code === baseLang);
  return (supported?.code || 'en') as SupportedLanguage;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get("reset") === "true";
  const initialMode = searchParams.get("mode") === "login" ? "login" : "register";
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  
  // Onboarding data
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(() => ({
    country: '',
    currency: 'EUR',
    categories: [],
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    language: detectBrowserLanguage(),
  }));
  
  // Password reset states
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

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData((prev) => ({ ...prev, ...updates }));
  };

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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(229 100% 55%) 0%, hsl(229 100% 40%) 100%)' }}>
        {/* Logo */}
        <div className="fixed top-8 left-8 z-20">
          <img src={fintTextWhite} alt="fint" className="h-7 w-auto" />
        </div>

        <div className="w-full max-w-[520px]">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t('setNewPassword')}
            </h1>
            <p className="text-lg text-white/80">
              {t('enterNewPassword', 'Enter your new password below')}
            </p>
          </div>

          {/* Card - Autonoma style */}
          <div className="bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-10">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('newPassword')}</label>
                <PasswordInput
                  placeholder={t('placeholders.password')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('confirmNewPassword')}</label>
                <PasswordInput
                  placeholder={t('placeholders.password')}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={updateLoading}
                  className="h-12 px-8 text-base font-medium bg-primary hover:bg-primary/90 text-white rounded-xl"
                >
                  {updateLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('updatePassword')}
                </Button>
              </div>
            </form>
          </div>

          <p className="text-center mt-8 text-white/80">
            <button 
              onClick={() => navigate("/auth")}
              className="text-white font-medium underline underline-offset-4 hover:no-underline"
            >
              {t('backToSignIn')}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: t('errors.title'),
        description: t('errors.passwordMismatch'),
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('errors.title'),
        description: t('errors.passwordTooShort'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const allCategories = [...onboardingData.incomeCategories, ...onboardingData.expenseCategories];
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
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      toast({
        title: t('errors.creatingAccount'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Save preferences if user was created
      if (data.user) {
        try {
          await supabase.from('user_preferences').upsert({
            user_id: data.user.id,
            country: onboardingData.country,
            base_currency: onboardingData.currency,
            selected_categories: allCategories,
            language: onboardingData.language,
            locale: localeMap[onboardingData.language] || 'en-US',
            onboarding_completed: true,
          });
        } catch (prefError) {
          console.error('Error saving preferences:', prefError);
        }
      }
      
      localStorage.setItem('i18nextLng', onboardingData.language);
      
      toast({
        title: t('success.accountCreated'),
        description: t('success.canSignIn'),
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
        title: t('errors.signingIn'),
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

  const canProceedStep = () => {
    switch (registerStep) {
      case 1:
        return !!onboardingData.language;
      case 2:
        return !!onboardingData.country;
      case 3:
        return !!onboardingData.currency;
      case 4:
        return onboardingData.incomeCategories.length > 0 && onboardingData.expenseCategories.length > 0;
      case 5:
        return fullName.trim() && emailValid && password.length >= 6 && password === confirmPassword;
      default:
        return true;
    }
  };

  const getStepQuestion = () => {
    switch (registerStep) {
      case 1:
        return tc('onboarding.selectLanguage', 'What language do you prefer?');
      case 2:
        return tc('onboarding.selectCountry', 'Where are you located?');
      case 3:
        return tc('onboarding.selectCurrency', 'What\'s your main currency?');
      case 4:
        return tc('onboarding.selectCategories', 'Which categories do you use?');
      case 5:
        return t('createYourAccount', 'Create your account');
      default:
        return '';
    }
  };

  const renderRegisterStep = () => {
    switch (registerStep) {
      case 1:
        return <StepLanguage data={onboardingData} updateData={updateOnboardingData} />;
      case 2:
        return <StepCountry data={onboardingData} updateData={updateOnboardingData} />;
      case 3:
        return <StepCurrency data={onboardingData} updateData={updateOnboardingData} />;
      case 4:
        return <StepCategories data={onboardingData} updateData={updateOnboardingData} />;
      case 5:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('fullName')}</label>
              <Input
                type="text"
                placeholder={t('placeholders.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
              <EmailInput
                placeholder={t('placeholders.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onValidChange={setEmailValid}
                required
                className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('password')}</label>
                <PasswordInput
                  placeholder={t('placeholders.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('confirmPassword')}</label>
                <PasswordInput
                  placeholder={t('placeholders.password')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
                />
              </div>
            </div>
            <PasswordStrengthIndicator password={password} />
          </div>
        );
      default:
        return null;
    }
  };

  // REGISTER MODE - Multi-step (Autonoma style)
  if (authMode === "register") {
    const totalSteps = 5;

    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, hsl(229 100% 55%) 0%, hsl(229 100% 40%) 100%)' }}
      >
        {/* Logo - fixed top left */}
        <div className="fixed top-8 left-8 z-20">
          <img src={fintTextWhite} alt="fint" className="h-7 w-auto" />
        </div>

        <div className="w-full max-w-[520px]">
          {/* Header text - outside card */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {tc('onboarding.letsGetStarted', "Let's get started")}
            </h1>
            <p className="text-lg text-white/80">
              {tc('onboarding.setupDescription', 'Set up your fint account in just a few steps')}
            </p>
          </div>

          {/* Card - Autonoma style: white, rounded-2xl, big shadow */}
          <div className="bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-10">
            {/* Progress bar - segmented style like Autonoma */}
            <div className="flex gap-2 mb-8">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < registerStep 
                      ? 'bg-primary' 
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Step indicator */}
            <p className="text-sm text-gray-400 mb-2">
              {registerStep} of {totalSteps}
            </p>

            {/* Question/Title - large and bold */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {getStepQuestion()}
            </h2>

            {/* Step content */}
            <div className="min-h-[200px]">
              {renderRegisterStep()}
            </div>

            {/* Navigation - right aligned Next button */}
            <div className="flex justify-between items-center pt-8">
              {registerStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setRegisterStep((prev) => (prev - 1) as RegisterStep)}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  ← {tc('back')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  ← {tc('back')}
                </button>
              )}

              {registerStep < 5 ? (
                <Button 
                  type="button"
                  onClick={() => setRegisterStep((prev) => (prev + 1) as RegisterStep)}
                  disabled={!canProceedStep()}
                  className="h-12 px-8 text-base font-medium bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tc('next')}
                </Button>
              ) : (
                <Button 
                  type="button"
                  onClick={handleSignUp}
                  disabled={!canProceedStep() || loading}
                  className="h-12 px-8 text-base font-medium bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    t('createAccount')
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Login link */}
          <p className="text-center mt-8 text-white/80">
            {t('alreadyHaveAccount', 'Already have an account?')}{' '}
            <button 
              onClick={() => setAuthMode("login")}
              className="text-white font-medium underline underline-offset-4 hover:no-underline"
            >
              {t('login')}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // LOGIN MODE (Autonoma style)
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, hsl(229 100% 55%) 0%, hsl(229 100% 40%) 100%)' }}
    >
      {/* Logo - fixed top left */}
      <div className="fixed top-8 left-8 z-20">
        <img src={fintTextWhite} alt="fint" className="h-7 w-auto" />
      </div>

      <div className="w-full max-w-[520px]">
        {/* Header text */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t('welcomeBack', 'Welcome back')}
          </h1>
          <p className="text-lg text-white/80">
            {t('signInToContinue', 'Sign in to continue to fint')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-10">
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
              <EmailInput
                placeholder={t('placeholders.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onValidChange={setEmailValid}
                required
                className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('password')}</label>
              <PasswordInput
                placeholder={t('placeholders.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  {t('rememberMe')}
                </Label>
              </div>
              <button
                type="button"
                onClick={() => {
                  toast({
                    title: t('forgotPassword'),
                    description: t('contactSupport', 'Please contact support to reset your password.'),
                  });
                }}
                className="text-sm text-primary hover:underline"
              >
                {t('forgotPassword')}
              </button>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={loading || !emailValid}
                className="h-12 px-8 text-base font-medium bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t('login')
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center mt-8 text-white/80">
          {t('noAccount', "Don't have an account?")}{' '}
          <button 
            onClick={() => setAuthMode("register")}
            className="text-white font-medium underline underline-offset-4 hover:no-underline"
          >
            {t('signup')}
          </button>
        </p>
      </div>
    </div>
  );
}
