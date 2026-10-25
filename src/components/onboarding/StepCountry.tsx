import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { COUNTRIES } from '@/lib/onboardingConstants';

interface StepCountryProps {
  country: string;
  onCountryChange: (country: string) => void;
}

const selectClasses = "w-full h-11 px-3.5 text-sm font-medium text-foreground bg-muted border-[1.5px] border-transparent rounded-xl shadow-none focus:bg-card focus:border-primary focus:ring-[3px] focus:ring-primary/[0.14] focus:outline-none transition-colors";

export function StepCountry({ country, onCountryChange }: StepCountryProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country" className="text-muted-foreground">{t('onboarding.step5.country')}</Label>
        <div className="pk-select-wrap">
          <select
            id="country"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            className={selectClasses}
          >
            <option value="" disabled>{t('onboarding.step5.selectCountry')}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
