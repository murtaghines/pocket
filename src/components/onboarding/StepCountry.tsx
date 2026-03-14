import { MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
          <Label htmlFor="country" className="text-gray-700">Country</Label>
          <Select value={country} onValueChange={handleCountryChange}>
            <SelectTrigger 
              id="country" 
              className="w-full h-14 px-4 text-base text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-0 transition-colors"
            >
              <SelectValue placeholder="Select your country" />
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
          <Label htmlFor="currency" className="text-gray-700">Base Currency</Label>
          <Select value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger 
              id="currency" 
              className="w-full h-14 px-4 text-base text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-0 transition-colors"
            >
              <SelectValue placeholder="Select currency" />
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
