import { Label } from '@/components/ui/label';
import { COUNTRIES, COUNTRY_CURRENCY_MAP, CURRENCIES } from '@/lib/onboardingConstants';

interface StepCountryProps {
  country: string;
  currency: string;
  onCountryChange: (country: string) => void;
  onCurrencyChange: (currency: string) => void;
}

export function StepCountry({ country, currency, onCountryChange, onCurrencyChange }: StepCountryProps) {
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
          <Label htmlFor="country" className="text-foreground/70">Country</Label>
          <div className="pk-select-wrap">
            <select
              id="country"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full h-14 px-4 text-base text-foreground bg-white border border-border rounded-xl focus:border-foreground/30 focus:ring-0 transition-colors"
            >
              <option value="" disabled>Select your country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency" className="text-foreground/70">Base Currency</Label>
          <div className="pk-select-wrap">
            <select
              id="currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="w-full h-14 px-4 text-base text-foreground bg-white border border-border rounded-xl focus:border-foreground/30 focus:ring-0 transition-colors"
            >
              <option value="" disabled>Select currency</option>
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
