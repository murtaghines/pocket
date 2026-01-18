import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

const TOTAL_STEPS = 3;

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const { t } = useTranslation('common');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { updatePreferences } = useUserPreferences();
  const { toast } = useToast();

  const [data, setData] = useState<OnboardingData>({
    country: '',
    currency: 'EUR',
    categories: [],
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    language: 'en',
  });

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

      await updatePreferences({
        country: data.country,
        base_currency: data.currency,
        selected_categories: allCategories,
        language: 'en',
        locale: 'en-US',
        onboarding_completed: true,
      } as any);

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
        return !!data.country;
      case 2:
        return !!data.currency;
      case 3:
        return data.incomeCategories.length > 0 && data.expenseCategories.length > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepCountry data={data} updateData={updateData} />;
      case 2:
        return <StepCurrency data={data} updateData={updateData} />;
      case 3:
        return <StepCategories data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Welcome to Fint! 👋';
      case 2:
        return 'Base Currency';
      case 3:
        return 'Categories';
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
