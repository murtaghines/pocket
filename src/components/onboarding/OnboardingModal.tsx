import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StepCountry } from './StepCountry';
import { StepCurrency } from './StepCurrency';
import { StepCategories } from './StepCategories';
import { StepLanguage } from './StepLanguage';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export interface OnboardingData {
  country: string;
  currency: string;
  categories: string[];
  language: string;
}

const TOTAL_STEPS = 4;

const DEFAULT_CATEGORIES = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'bills',
  'health',
  'others',
];

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { updatePreferences } = useUserPreferences();
  const { toast } = useToast();

  const [data, setData] = useState<OnboardingData>({
    country: '',
    currency: 'EUR',
    categories: DEFAULT_CATEGORIES,
    language: 'en',
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
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

  const getLocaleFromLanguage = (lang: string) => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      fr: 'fr-FR',
      it: 'it-IT',
      de: 'de-DE',
    };
    return localeMap[lang] || 'en-US';
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        country: data.country,
        base_currency: data.currency,
        selected_categories: data.categories,
        language: data.language,
        locale: getLocaleFromLanguage(data.language),
        onboarding_completed: true,
      } as any);

      toast({
        title: 'Welcome!',
        description: 'Your preferences have been saved.',
      });
      onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
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
        return data.categories.length > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepLanguage data={data} updateData={updateData} />;
      case 2:
        return <StepCountry data={data} updateData={updateData} />;
      case 3:
        return <StepCurrency data={data} updateData={updateData} />;
      case 4:
        return <StepCategories data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">
            {step === 1 && 'Welcome to FinanceFlow! 👋'}
            {step === 2 && 'Your Region'}
            {step === 3 && 'Base Currency'}
            {step === 4 && 'Expense Categories'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        <div className="py-6 min-h-[300px]">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || saving}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed() || saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Get Started
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
