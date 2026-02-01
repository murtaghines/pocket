import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StepLanguage } from './StepLanguage';
import { StepCountry } from './StepCountry';
import { StepCurrency } from './StepCurrency';
import { StepCategories } from './StepCategories';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from '@/lib/categoryTranslations';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export interface OnboardingData {
  country: string;
  currency: string;
  categories: string[];
  incomeCategories: string[];
  expenseCategories: string[];
  language: string;
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

  // Initialize with browser language
  const [data, setData] = useState<OnboardingData>(() => ({
    country: '',
    currency: 'EUR',
    categories: [],
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    language: detectBrowserLanguage(),
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
      const allCategories = [...data.incomeCategories, ...data.expenseCategories];
      
      // Map language to locale
      const localeMap: Record<string, string> = {
        en: 'en-US',
        es: 'es-ES',
        pt: 'pt-BR',
      };

      await updatePreferences({
        country: data.country,
        base_currency: data.currency,
        selected_categories: allCategories,
        language: data.language,
        locale: localeMap[data.language] || 'en-US',
        onboarding_completed: true,
      } as any);
      
      // Persist language to localStorage for i18next
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
        return !!data.country;
      case 3:
        return !!data.currency;
      case 4:
        return data.incomeCategories.length > 0 && data.expenseCategories.length > 0;
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
            onCountryChange={(country) => updateData({ country })} 
          />
        );
      case 3:
        return (
          <StepCurrency 
            currency={data.currency} 
            onCurrencyChange={(currency) => updateData({ currency })} 
          />
        );
      case 4:
        return <StepCategories data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return t('onboarding.welcome', 'Welcome to wallet! 👋');
      case 2:
        return t('onboarding.yourCountry', 'Your Country');
      case 3:
        return t('onboarding.baseCurrency', 'Base Currency');
      case 4:
        return t('onboarding.categories', 'Categories');
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
