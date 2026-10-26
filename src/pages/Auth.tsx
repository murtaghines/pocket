import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";
import { supabase } from "@/integrations/supabase/client";
import { getRememberPreference, setRememberPreference, transferSessionToSessionStorage } from "@/lib/sessionStorage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, ArrowRight, Globe } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { PasswordInput } from "@/components/ui/password-input";
import { EmailInput } from "@/components/ui/email-input";
import { LandingHeader } from "@/components/landing/LandingHeader";

import { StepBankAccount } from "@/components/onboarding/StepBankAccount";
import { StepName } from "@/components/onboarding/StepName";
import { StepEmail } from "@/components/onboarding/StepEmail";
import { StepPassword } from "@/components/onboarding/StepPassword";
import { StepCountry } from "@/components/onboarding/StepCountry";
import { StepCurrency } from "@/components/onboarding/StepCurrency";
import { StepSharedFinances } from "@/components/onboarding/StepSharedFinances";
import { COUNTRY_CURRENCY_MAP, COUNTRY_DATE_FORMAT_MAP } from "@/lib/onboardingConstants";
import { SUPPORTED_LANGUAGES, COUNTRY_LANGUAGE_MAP, type SupportedLanguage } from "@/i18n/config";
import { normalize, extractKeyTokens } from "@/lib/userRules";


const REMEMBER_EMAIL_KEY = "pocket_remember_email";

type AuthMode = "login" | "register";
type RegisterStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const OPTIONAL_STEPS: RegisterStep[] = [7];

const TOTAL_STEPS = 7;

const AUTH_GRADIENT = 'linear-gradient(to right, hsl(216 100% 55%) 0%, hsl(216 100% 42%) 100%)';

const inputClasses = "w-full h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-none";

function detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language || 'en';
  const baseLang = browserLang.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.find(l => l.code === baseLang);
  return (supported?.code || 'en') as SupportedLanguage;
}

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isResetMode = searchParams.get("reset") === "true";
  const modeFromUrl = searchParams.get("mode") === "login" ? "login" : "register";
  const { t } = useTranslation('auth');

  const [authMode, setAuthModeState] = useState<AuthMode>(modeFromUrl);

  const setAuthMode = (mode: AuthMode) => {
    setAuthModeState(mode);
    setPassword("");
    setConfirmPassword("");
    if (mode === "register") {
      setRegisterStep(1);
      setEmail("");
      setEmailValid(false);
      setBankName("");
      setAccountNickname("");
      setAccountType("CHECKING");
    }
    if (mode === "login") {
      setSearchParams({ mode: "login" });
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) setEmail(savedEmail);
      else setEmail("");
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
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [hasSharedAccount, setHasSharedAccount] = useState<boolean | null>(null);
  const [coHolderName, setCoHolderName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNickname, setAccountNickname] = useState("");
  const [accountType, setAccountType] = useState<"CHECKING" | "SAVINGS" | "CREDIT_CARD">("CHECKING");
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('i18nextLng');
      if (saved && ['en', 'es'].includes(saved)) return saved as SupportedLanguage;
    } catch { /* ignore */ }
    const detected = detectBrowserLanguage();
    if (detected !== 'en') i18n.changeLanguage(detected);
    return detected;
  });

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as SupportedLanguage);
    i18n.changeLanguage(lang);
  };

  const renderLanguageToggle = () => (
    <div className="flex items-center justify-center gap-2 py-4 text-sm shrink-0">
      <Globe className="w-3.5 h-3.5 text-white/50" />
      {SUPPORTED_LANGUAGES.map((lang, i) => (
        <span key={lang.code} className="flex items-center gap-2">
          {i > 0 && <span className="text-white/30">|</span>}
          <button
            type="button"
            onClick={() => handleLanguageChange(lang.code)}
            className={language === lang.code ? 'text-white font-medium' : 'text-white/50 hover:text-white/70'}
          >
            {t(`languages.${lang.code}`)}
          </button>
        </span>
      ))}
    </div>
  );

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

    if (savedEmail && modeFromUrl === "login") {
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
        description: t('success.signInWithNewPassword'),
      });
      await supabase.auth.signOut();
      navigate("/auth?mode=login");
    }
    setUpdateLoading(false);
  };

  // Password Reset Mode
  if (isResetMode) {
    return (
      <div className="h-dvh overflow-hidden flex flex-col" style={{ background: AUTH_GRADIENT }}>
        <LandingHeader />

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">
              {t('setNewPassword')}
            </h1>
            <p className="text-base text-white/70 max-w-md mx-auto">
              {t('resetSubtitle')}
            </p>
          </div>

          <div className="w-full max-w-[560px] dashboard-theme bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 md:p-10">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">{t('newPassword')}</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClasses}
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">{t('confirmPassword')}</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClasses}
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
              ← {t('backToSignIn')}
            </button>
          </p>
        </div>

        {renderLanguageToggle()}
      </div>
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const finalizeSignUp = async () => {
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
        title: t('errors.creatingAccount'),
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
          title: t('success.accountCreated'),
          description: t('success.canSignIn'),
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
          date_format: dateFormat,
          joint_account_names: coHolderName.trim() ? [coHolderName.trim()] : [],
          onboarding_completed: true,
        });
      } catch (prefError) {
        console.error('Error saving preferences:', prefError);
      }

      try {
        await supabase.from('profiles').upsert({
          user_id: userId,
          email: normalizedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }, { onConflict: 'user_id' });
      } catch (profileError) {
        console.error('Error updating profile:', profileError);
      }

      if (bankName.trim()) {
        try {
          await supabase.from('accounts').insert({
            user_id: userId,
            institution: bankName.trim(),
            name: accountNickname.trim() || bankName.trim(),
            account_type: accountType,
            account_role: 'CASH' as const,
            currency_base: currency,
            initial_balance: 0,
          });
        } catch (accountError) {
          console.error('Error creating bank account:', accountError);
        }
      }

      if (hasSharedAccount && coHolderName.trim() && bankName.trim()) {
        try {
          await supabase.from('accounts').insert({
            user_id: userId,
            institution: bankName.trim(),
            name: coHolderName.trim(),
            account_type: 'JOINT' as const,
            account_role: 'CASH' as const,
            currency_base: currency,
            initial_balance: 0,
          });
        } catch (jointError) {
          console.error('Error creating joint account:', jointError);
        }
      }

      // Auto-generate user rules based on onboarding answers
      try {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const rules: Array<{
          user_id: string;
          source: string;
          match_type: string;
          pattern: string;
          tokens: string[];
          movement: string;
          category: string;
          confidence: number;
        }> = [];

        if (fullName) {
          const nameNorm = normalize(fullName);
          const nameTokens = extractKeyTokens(fullName);
          // "To myself" rule
          rules.push({
            user_id: userId,
            source: 'onboarding',
            match_type: 'fuzzy',
            pattern: nameNorm,
            tokens: nameTokens,
            movement: 'TRANSFER',
            category: 'own_transfer',
            confidence: 0.90,
          });
          // "From myself" rule
          rules.push({
            user_id: userId,
            source: 'onboarding',
            match_type: 'fuzzy',
            pattern: nameNorm,
            tokens: nameTokens,
            movement: 'TRANSFER',
            category: 'from_myself',
            confidence: 0.85,
          });
        }

        if (coHolderName.trim()) {
          const coNorm = normalize(coHolderName.trim());
          const coTokens = extractKeyTokens(coHolderName.trim());
          // "To joint account" rule
          rules.push({
            user_id: userId,
            source: 'onboarding',
            match_type: 'fuzzy',
            pattern: coNorm,
            tokens: coTokens,
            movement: 'TRANSFER',
            category: 'to_joint_account',
            confidence: 0.85,
          });
          // "From joint account" rule
          rules.push({
            user_id: userId,
            source: 'onboarding',
            match_type: 'fuzzy',
            pattern: coNorm,
            tokens: coTokens,
            movement: 'TRANSFER',
            category: 'from_joint_account',
            confidence: 0.80,
          });
        }

        if (rules.length > 0) {
          await supabase.from('user_rules').insert(rules);
        }
      } catch (rulesError) {
        console.error('Error creating onboarding rules:', rulesError);
      }
    }

    localStorage.setItem('i18nextLng', language);
    setRememberPreference(true);

    toast({
      title: t('success.welcome'),
      description: t('success.accountReady'),
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
        title: t('errors.signingIn'),
        description: isInvalidCreds
          ? t('errors.wrongCredentials')
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

  const handleCountryChange = (value: string) => {
    setCountry(value);
    const mapped = COUNTRY_CURRENCY_MAP[value];
    if (mapped) setCurrency(mapped);
    setDateFormat(COUNTRY_DATE_FORMAT_MAP[value] || 'DD/MM/YYYY');
  };

  const canProceedStep = (): boolean => {
    switch (registerStep) {
      case 1:
        return firstName.trim().length > 0;
      case 2:
        return emailValid;
      case 3:
        return password.length >= 6 && password === confirmPassword;
      case 4:
        return country.length > 0;
      case 5:
        return currency.length > 0;
      case 6:
        return bankName.trim().length > 0;
      case 7:
        return hasSharedAccount !== null && (hasSharedAccount === false || coHolderName.trim().length > 0);
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
        return (
          <StepPassword
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
          />
        );
      case 4:
        return <StepCountry country={country} onCountryChange={handleCountryChange} />;
      case 5:
        return <StepCurrency currency={currency} dateFormat={dateFormat} onCurrencyChange={setCurrency} onDateFormatChange={setDateFormat} />;
      case 6:
        return <StepBankAccount bankName={bankName} accountNickname={accountNickname} accountType={accountType} onBankNameChange={setBankName} onAccountNicknameChange={setAccountNickname} onAccountTypeChange={setAccountType} />;
      case 7:
        return <StepSharedFinances hasSharedAccount={hasSharedAccount} coHolderName={coHolderName} onHasSharedAccountChange={setHasSharedAccount} onCoHolderNameChange={setCoHolderName} />;
      default:
        return null;
    }
  };

  // REGISTER MODE
  if (authMode === "register") {
    return (
      <div className="h-dvh overflow-hidden flex flex-col" style={{ background: AUTH_GRADIENT }}>
        <LandingHeader />

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">
              {t('onboarding.getStarted')}
            </h1>
            <p className="text-base text-white/70 max-w-md mx-auto">
              {t('onboarding.subtitle')}
            </p>
          </div>

          <div className="w-full max-w-[560px] dashboard-theme bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 md:p-10 flex flex-col h-[460px]">
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

            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {t('onboarding.stepOf', { current: registerStep, total: TOTAL_STEPS })}
              </p>
              {OPTIONAL_STEPS.includes(registerStep) && (
                <button
                  type="button"
                  onClick={() => registerStep === TOTAL_STEPS ? handleNext() : setRegisterStep((prev) => (prev + 1) as RegisterStep)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('onboarding.skip')}
                </button>
              )}
            </div>

            <h2 className={`text-xl font-semibold text-foreground ${registerStep === 3 ? 'mb-3' : 'mb-1'}`}>
              {t(`onboarding.step${registerStep}.question`)}
            </h2>
            {registerStep !== 3 && <p className="text-sm text-muted-foreground mb-5">{t(`onboarding.step${registerStep}.why`)}</p>}

            <div className="flex-1 overflow-y-auto min-h-0">
              {renderRegisterStep()}
            </div>

            <div className={`flex justify-between items-center mt-auto ${registerStep === 3 ? 'pt-4' : 'pt-6'}`}>
              <div className="flex items-center gap-4">
                {registerStep > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                  >
                    ← {t('onboarding.back')}
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
                  t('createAccount')
                ) : (
                  <>
                    {t('onboarding.next')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-center mt-6 text-white/80">
            {t('hasAccount')}{' '}
            <button
              onClick={() => setAuthMode("login")}
              className="text-white font-medium underline underline-offset-4 hover:no-underline"
            >
              {t('login')}
            </button>
          </p>
        </div>

        {renderLanguageToggle()}
      </div>
    );
  }

  // LOGIN MODE
  return (
    <div className="h-dvh overflow-hidden flex flex-col" style={{ background: AUTH_GRADIENT }}>
      <LandingHeader />

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">
            {t('welcomeBack')}
          </h1>
          <p className="text-base text-white/70 max-w-md mx-auto">
            {t('loginSubtitle')}
          </p>
        </div>

        <div className="w-full max-w-[560px] dashboard-theme bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 md:p-10 flex flex-col" style={{ height: '460px' }}>
          <form onSubmit={handleSignIn} className="space-y-6 flex-1 flex flex-col">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t('email')}</label>
              <EmailInput
                placeholder={t('placeholders.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onValidChange={setEmailValid}
                required
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t('password')}</label>
              <PasswordInput
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClasses}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  {t('rememberMe')}
                </Label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!emailValid || !normalizedEmail) {
                    toast({
                      title: t('errors.enterEmailFirst'),
                      description: t('errors.enterEmailFirstDesc'),
                      variant: "destructive",
                    });
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                    redirectTo: `${window.location.origin}/auth?reset=true`,
                  });
                  if (error) {
                    toast({
                      title: t('errors.couldntSendReset'),
                      description: error.message,
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: t('success.checkEmail'),
                      description: t('success.resetLinkSentTo', { email: normalizedEmail }),
                    });
                  }
                }}
                className="text-sm text-primary hover:underline"
              >
                {t('forgotPassword')}
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
                  t('login')
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center mt-6 text-white/80">
          {t('noAccount')}{' '}
          <button
            onClick={() => setAuthMode("register")}
            className="text-white font-medium underline underline-offset-4 hover:no-underline"
          >
            {t('getStarted')}
          </button>
        </p>
      </div>

      {renderLanguageToggle()}
    </div>
  );
}
