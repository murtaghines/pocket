import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StepLanguage } from './StepLanguage';
import { StepCountry } from './StepCountry';
import { StepInvestments } from './StepInvestments';
import { StepJointAccount } from './StepJointAccount';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config';
import { COUNTRY_CURRENCY_MAP } from '@/lib/onboardingConstants';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export interface OnboardingData {
  country: string;
  currency: string;
  language: string;
  investmentPlatforms: string[];
  jointAccountNames: string[];
}

const TOTAL_STEPS = 4;

// Detect browser language
function detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language || 'en';
  const baseLang = browserLang.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.find(l => l.code === baseLang);
  return (supported?.code || 'en') as SupportedLanguage;
}

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const { t } = useTranslation('common');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { updatePreferences } = useUserPreferences();
  const { toast } = useToast();

  const [data, setData] = useState<OnboardingData>(() => ({
    country: '',
    currency: 'EUR',
    language: detectBrowserLanguage(),
    investmentPlatforms: [],
    jointAccountNames: [],
  }));

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const localeMap: Record<string, string> = {
        en: 'en-US',
        es: 'es-ES',
        pt: 'pt-BR',
      };

      await updatePreferences({
        country: data.country,
        base_currency: data.currency,
        language: data.language,
        locale: localeMap[data.language] || 'en-US',
        onboarding_completed: true,
        investment_platforms: data.investmentPlatforms,
        joint_account_names: data.jointAccountNames,
      } as any);
      
      localStorage.setItem('i18nextLng', data.language);

      toast({
        title: t('success'),
        description: t('saved', { defaultValue: 'Preferences saved successfully' }),
      });
      onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: t('error'),
        description: t('saveFailed', { defaultValue: 'Failed to save preferences. Please try again.' }),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!data.language;
      case 2:
        return !!data.country && !!data.currency;
      case 3:
        return true; // optional
      case 4:
        return true; // optional
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepLanguage data={data} updateData={updateData} />;
      case 2:
        return (
          <StepCountry 
            country={data.country}
            currency={data.currency}
            onCountryChange={(country) => {
              updateData({ country });
              const mapped = COUNTRY_CURRENCY_MAP[country];
              if (mapped) updateData({ country, currency: mapped });
            }}
            onCurrencyChange={(currency) => updateData({ currency })}
          />
        );
      case 3:
        return (
          <StepInvestments
            country={data.country}
            selectedPlatforms={data.investmentPlatforms}
            onPlatformsChange={(platforms) => updateData({ investmentPlatforms: platforms })}
          />
        );
      case 4:
        return (
          <StepJointAccount
            jointAccountNames={data.jointAccountNames}
            onJointAccountNamesChange={(names) => updateData({ jointAccountNames: names })}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return t('onboarding.welcome', 'Welcome to wallet! 👋');
      case 2:
        return t('onboarding.yourCountry', 'Your Country & Currency');
      case 3:
        return t('onboarding.investments', 'Do you invest?');
      case 4:
        return t('onboarding.jointAccount', 'Shared finances?');
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">{getStepTitle()}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {step} / {TOTAL_STEPS}
          </p>
        </div>

        <div className="py-6 min-h-[300px]">{renderStep()}</div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || saving}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>

          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              {t('next')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed() || saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {t('confirm')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
