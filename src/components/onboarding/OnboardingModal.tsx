import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StepCountry } from './StepCountry';
import { StepCurrency } from './StepCurrency';
import { StepCategories } from './StepCategories';
import { StepLanguage } from './StepLanguage';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLocalization } from '@/hooks/useLocalization';
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
  categories: string[]; // Legacy: combined categories for backward compat
  incomeCategories: string[];
  expenseCategories: string[];
  language: string;
}

const TOTAL_STEPS = 4;

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { updatePreferences } = useUserPreferences();
  const { t } = useLocalization();
  const { toast } = useToast();

  const [data, setData] = useState<OnboardingData>({
    country: '',
    currency: 'EUR',
    categories: [], // Legacy
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

  // Get translation based on current onboarding language selection
  const getOnboardingText = (key: string) => {
    const texts: Record<string, Record<string, string>> = {
      welcome: {
        en: 'Welcome to Fint! 👋',
        es: '¡Bienvenido a Fint! 👋',
        pt: 'Bem-vindo ao Fint! 👋',
        fr: 'Bienvenue sur Fint! 👋',
        it: 'Benvenuto su Fint! 👋',
        de: 'Willkommen bei Fint! 👋',
      },
      your_region: {
        en: 'Your Region',
        es: 'Tu Región',
        pt: 'Sua Região',
        fr: 'Votre Région',
        it: 'La Tua Regione',
        de: 'Ihre Region',
      },
      base_currency: {
        en: 'Base Currency',
        es: 'Moneda Base',
        pt: 'Moeda Base',
        fr: 'Devise de Base',
        it: 'Valuta Base',
        de: 'Basiswährung',
      },
      categories: {
        en: 'Categories',
        es: 'Categorías',
        pt: 'Categorias',
        fr: 'Catégories',
        it: 'Categorie',
        de: 'Kategorien',
      },
      step: {
        en: 'Step',
        es: 'Paso',
        pt: 'Passo',
        fr: 'Étape',
        it: 'Passo',
        de: 'Schritt',
      },
      of: {
        en: 'of',
        es: 'de',
        pt: 'de',
        fr: 'sur',
        it: 'di',
        de: 'von',
      },
      back: {
        en: 'Back',
        es: 'Atrás',
        pt: 'Voltar',
        fr: 'Retour',
        it: 'Indietro',
        de: 'Zurück',
      },
      next: {
        en: 'Next',
        es: 'Siguiente',
        pt: 'Próximo',
        fr: 'Suivant',
        it: 'Avanti',
        de: 'Weiter',
      },
      get_started: {
        en: 'Get Started',
        es: 'Comenzar',
        pt: 'Começar',
        fr: 'Commencer',
        it: 'Inizia',
        de: 'Loslegen',
      },
    };
    return texts[key]?.[data.language] || texts[key]?.['en'] || key;
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Combine income and expense categories for storage
      const allCategories = [...data.incomeCategories, ...data.expenseCategories];

      await updatePreferences({
        country: data.country,
        base_currency: data.currency,
        selected_categories: allCategories,
        language: data.language,
        locale: getLocaleFromLanguage(data.language),
        onboarding_completed: true,
      } as any);

      toast({
        title: getOnboardingText('get_started'),
        description: t('onboarding.preferences_saved'),
      });
      onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: t('common.error'),
        description: t('onboarding.error_saving'),
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
        // Must have at least one income and one expense category
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
        return <StepCountry data={data} updateData={updateData} />;
      case 3:
        return <StepCurrency data={data} updateData={updateData} />;
      case 4:
        return <StepCategories data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return getOnboardingText('welcome');
      case 2:
        return getOnboardingText('your_region');
      case 3:
        return getOnboardingText('base_currency');
      case 4:
        return getOnboardingText('categories');
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
            {getOnboardingText('step')} {step} {getOnboardingText('of')} {TOTAL_STEPS}
          </p>
        </div>

        <div className="py-6 min-h-[300px]">{renderStep()}</div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || saving}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            {getOnboardingText('back')}
          </Button>

          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              {getOnboardingText('next')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed() || saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {getOnboardingText('get_started')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
