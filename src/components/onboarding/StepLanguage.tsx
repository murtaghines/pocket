import { OnboardingData } from './OnboardingModal';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config';

interface StepLanguageProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepLanguage({ data, updateData }: StepLanguageProps) {
  const { t, i18n } = useTranslation('settings');

  const handleLanguageChange = (language: string) => {
    updateData({ language });
    // Also update i18n immediately for visual feedback
    i18n.changeLanguage(language);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Globe className="w-5 h-5" />
        <p>{t('onboarding.languageDescription', 'Choose your preferred language for the app.')}</p>
      </div>

      <div className="space-y-3">
        <Label>{t('language', 'Language')}</Label>
        <RadioGroup
          value={data.language}
          onValueChange={handleLanguageChange}
          className="grid gap-3"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                data.language === lang.code
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <RadioGroupItem value={lang.code} id={`lang-${lang.code}`} />
              <Label
                htmlFor={`lang-${lang.code}`}
                className="flex-1 cursor-pointer flex items-center justify-between"
              >
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-sm text-muted-foreground">{lang.name}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
