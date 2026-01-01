import { OnboardingData } from './OnboardingModal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

interface StepCountryProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const COUNTRIES = [
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'OTHER', name: 'Other', currency: 'EUR' },
];

export function StepCountry({ data, updateData }: StepCountryProps) {
  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    updateData({ 
      country: countryCode,
      currency: country?.currency || 'EUR',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Globe className="w-5 h-5" />
        <p>Let's start by selecting your country. This helps us set the right defaults for you.</p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="country">Your Country</Label>
        <Select value={data.country} onValueChange={handleCountryChange}>
          <SelectTrigger id="country" className="w-full">
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.country && (
        <p className="text-sm text-muted-foreground">
          Based on your country, we'll suggest {COUNTRIES.find(c => c.code === data.country)?.currency} as your currency.
        </p>
      )}
    </div>
  );
}
