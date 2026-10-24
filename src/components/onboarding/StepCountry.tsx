import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { COUNTRIES, COUNTRY_CURRENCY_MAP, CURRENCIES } from '@/lib/onboardingConstants';

interface StepCountryProps {
  country: string;
  currency: string;
  onCountryChange: (country: string) => void;
  onCurrencyChange: (currency: string) => void;
}

const selectClasses = "w-full h-11 px-3.5 text-sm font-medium bg-muted border-[1.5px] border-transparent rounded-xl shadow-none focus:bg-card focus:border-primary focus:ring-[3px] focus:ring-primary/[0.14] focus:outline-none transition-colors";

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
          <div className="pk-select-wrap">
            <select
              id="country"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className={selectClasses}
            >
              <option value="" disabled>{t('onboarding.step4.selectCountry')}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency" className="text-muted-foreground">{t('onboarding.step4.currency')}</Label>
          <div className="pk-select-wrap">
            <select
              id="currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className={selectClasses}
            >
              <option value="" disabled>{t('onboarding.step4.selectCurrency')}</option>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
      </div>
    </div>
  );
}
