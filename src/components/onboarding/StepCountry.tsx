import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES, COUNTRY_CURRENCY_MAP, CURRENCIES } from '@/lib/onboardingConstants';

interface StepCountryProps {
  country: string;
  currency: string;
  onCountryChange: (country: string) => void;
  onCurrencyChange: (currency: string) => void;
}

const triggerClasses = "w-full h-11 px-3.5 text-sm font-medium bg-muted border-[1.5px] border-transparent rounded-xl shadow-none focus:bg-card focus:border-primary focus:ring-[3px] focus:ring-primary/[0.14] focus:outline-none transition-colors";

export function StepCountry({ country, currency, onCountryChange, onCurrencyChange }: StepCountryProps) {
  const { t } = useTranslation('auth');

  const handleCountryChange = (value: string) => {
    onCountryChange(value);
    const mapped = COUNTRY_CURRENCY_MAP[value];
    if (mapped) {
      onCurrencyChange(mapped);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country" className="text-muted-foreground">{t('onboarding.step4.country')}</Label>
        <Select value={country} onValueChange={handleCountryChange}>
          <SelectTrigger className={triggerClasses}>
            <SelectValue placeholder={t('onboarding.step4.selectCountry')} />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency" className="text-muted-foreground">{t('onboarding.step4.currency')}</Label>
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className={triggerClasses}>
            <SelectValue placeholder={t('onboarding.step4.selectCurrency')} />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
