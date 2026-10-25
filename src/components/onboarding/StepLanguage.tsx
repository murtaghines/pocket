import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface StepLanguageProps {
  language: string;
  onLanguageChange: (lang: string) => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export function StepLanguage({ language, onLanguageChange }: StepLanguageProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-3">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => onLanguageChange(lang.code)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-[1.5px] transition-colors text-left ${
            language === lang.code
              ? 'border-primary bg-primary/5'
              : 'border-transparent bg-muted hover:bg-muted/80'
          }`}
        >
          <Globe className={`w-5 h-5 ${language === lang.code ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-medium ${language === lang.code ? 'text-foreground' : 'text-foreground'}`}>
            {lang.label}
          </span>
        </button>
      ))}
    </div>
  );
}
