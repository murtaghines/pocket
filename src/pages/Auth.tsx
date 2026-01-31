import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getRememberPreference, setRememberPreference, transferSessionToSessionStorage } from "@/lib/sessionStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Check, KeyRound } from "lucide-react";
import fintTextWhite from "@/assets/fint-text-white.png";
import authBackground from "@/assets/auth-background.png";
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
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-2xl rounded-2xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="font-display text-xl font-bold text-primary">fint</span>
            </div>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">{t('setNewPassword')}</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-gray-700">{t('newPassword')}</Label>
                <PasswordInput
                  id="new-password"
                  placeholder={t('placeholders.password')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700"
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-gray-700">{t('confirmNewPassword')}</Label>
                <PasswordInput
                  id="confirm-new-password"
                  placeholder={t('placeholders.password')}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-lg" disabled={updateLoading}>
                {updateLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('updatePassword')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                {t('backToSignIn')}
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

  const getStepTitle = () => {
    switch (registerStep) {
      case 1:
        return tc('onboarding.welcome', 'Welcome to fint! 👋');
      case 2:
        return tc('onboarding.yourCountry', 'Your Country');
      case 3:
        return tc('onboarding.baseCurrency', 'Base Currency');
      case 4:
        return tc('onboarding.categories', 'Categories');
      case 5:
        return t('createYourAccount', 'Create your account');
      default:
        return '';
    }
  };

  const getStepSubtitle = () => {
    switch (registerStep) {
      case 1:
        return tc('onboarding.selectLanguage', 'Select your preferred language');
      case 2:
        return tc('onboarding.selectCountry', 'Where are you located?');
      case 3:
        return tc('onboarding.selectCurrency', 'Choose your main currency');
      case 4:
        return tc('onboarding.selectCategories', 'Select the categories you use');
      case 5:
        return t('almostThere', 'Almost there! Enter your details');
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
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name" className="text-sm font-medium text-gray-700">{t('fullName')}</Label>
              <Input
                id="full-name"
                type="text"
                placeholder={t('placeholders.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-register" className="text-sm font-medium text-gray-700">{t('email')}</Label>
              <EmailInput
                id="email-register"
                placeholder={t('placeholders.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onValidChange={setEmailValid}
                required
                className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password-register" className="text-sm font-medium text-gray-700">{t('password')}</Label>
                <PasswordInput
                  id="password-register"
                  placeholder={t('placeholders.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">{t('confirmPassword')}</Label>
                <PasswordInput
                  id="confirm-password"
                  placeholder={t('placeholders.password')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
                />
              </div>
            </div>
            <PasswordStrengthIndicator password={password} />
          </form>
        );
      default:
        return null;
    }
  };

  // REGISTER MODE - Multi-step
  if (authMode === "register") {
    const totalSteps = 5;
    const progress = (registerStep / totalSteps) * 100;

    return (
      <div 
        className="min-h-screen w-full relative flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: 'hsl(229, 100%, 66%)' }}
      >
        {/* Background image */}
        <div 
          className="fixed inset-0 w-full bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${authBackground})`,
            height: '100%'
          }}
        />
        
        {/* Logo - top left */}
        <div className="fixed top-6 left-6 z-20">
          <img src={fintTextWhite} alt="fint" className="h-6 w-auto" />
        </div>

        {/* Header text */}
        <div className="relative z-10 text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            {getStepTitle()}
          </h1>
          <p className="text-lg text-white/70">
            {getStepSubtitle()}
          </p>
        </div>

        {/* Card */}
        <Card className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
          <CardContent className="p-8">
            {/* Progress bar */}
            <div className="mb-6">
              <Progress value={progress} className="h-1.5" />
              <p className="text-sm text-gray-400 mt-2">
                {registerStep} of {totalSteps}
              </p>
            </div>

            {/* Step content */}
            <div className="min-h-[280px]">
              {renderRegisterStep()}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6 border-t mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (registerStep === 1) {
                    setAuthMode("login");
                  } else {
                    setRegisterStep((prev) => (prev - 1) as RegisterStep);
                  }
                }}
                disabled={loading}
                className="text-gray-700"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {tc('back')}
              </Button>

              {registerStep < 5 ? (
                <Button 
                  onClick={() => setRegisterStep((prev) => (prev + 1) as RegisterStep)}
                  disabled={!canProceedStep()}
                >
                  {tc('next')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSignUp}
                  disabled={!canProceedStep() || loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {t('createAccount')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Login link */}
        <p className="relative z-10 mt-6 text-white/70">
          {t('alreadyHaveAccount', 'Already have an account?')}{' '}
          <button 
            onClick={() => setAuthMode("login")}
            className="text-white font-medium underline hover:no-underline"
          >
            {t('login')}
          </button>
        </p>
      </div>
    );
  }

  // LOGIN MODE
  return (
    <div 
      className="min-h-screen w-full relative flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'hsl(229, 100%, 66%)' }}
    >
      {/* Background image */}
      <div 
        className="fixed inset-0 w-full bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${authBackground})`,
          height: '100%'
        }}
      />
      
      {/* Logo - top left */}
      <div className="fixed top-6 left-6 z-20">
        <img src={fintTextWhite} alt="fint" className="h-6 w-auto" />
      </div>

      {/* Header text */}
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          {t('welcomeBack', 'Welcome back')}
        </h1>
        <p className="text-lg text-white/70">
          {t('signInToContinue', 'Sign in to continue to fint')}
        </p>
      </div>

      {/* Card */}
      <Card className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <CardContent className="p-8">
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email-login" className="text-sm font-medium text-gray-700">{t('email')}</Label>
              <EmailInput
                id="email-login"
                placeholder={t('placeholders.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onValidChange={setEmailValid}
                required
                className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password-login" className="text-sm font-medium text-gray-700">{t('password')}</Label>
              <PasswordInput
                id="password-login"
                placeholder={t('placeholders.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-100 border-0 h-12 rounded-lg text-gray-700 placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  {t('rememberMe')}
                </Label>
              </div>
              <button
                type="button"
                onClick={() => {
                  // For now, just show a toast - implement dialog if needed
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
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium rounded-lg" 
              disabled={loading || !emailValid}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t('login')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Register link */}
      <p className="relative z-10 mt-6 text-white/70">
        {t('noAccount', "Don't have an account?")}{' '}
        <button 
          onClick={() => setAuthMode("register")}
          className="text-white font-medium underline hover:no-underline"
        >
          {t('signup')}
        </button>
      </p>
    </div>
  );
}
