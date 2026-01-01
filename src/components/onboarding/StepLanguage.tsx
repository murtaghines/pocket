import { OnboardingData } from './OnboardingModal';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Languages } from 'lucide-react';

interface StepLanguageProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
];

export function StepLanguage({ data, updateData }: StepLanguageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Languages className="w-5 h-5" />
        <p>Choose your preferred language for the interface. You can change this later in your profile settings.</p>
      </div>

      <RadioGroup
        value={data.language}
        onValueChange={(value) => updateData({ language: value })}
        className="space-y-3"
      >
        {LANGUAGES.map((lang) => (
          <div
            key={lang.code}
            className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors cursor-pointer ${
              data.language === lang.code
                ? 'bg-primary/5 border-primary/20'
                : 'bg-background hover:bg-muted/50'
            }`}
            onClick={() => updateData({ language: lang.code })}
          >
            <RadioGroupItem value={lang.code} id={lang.code} />
            <Label htmlFor={lang.code} className="flex items-center gap-3 cursor-pointer flex-1">
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          🎉 You're all set! Click "Get Started" to begin tracking your finances.
        </p>
      </div>
    </div>
  );
}
