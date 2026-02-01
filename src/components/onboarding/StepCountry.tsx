import { MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StepCountryProps {
  country: string;
  onCountryChange: (country: string) => void;
}

const COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'PE', name: 'Peru' },
  { code: 'ES', name: 'Spain' },
  { code: 'US', name: 'United States' },
  { code: 'PT', name: 'Portugal' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'OTHER', name: 'Other' },
];

export function StepCountry({ country, onCountryChange }: StepCountryProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-gray-500">
        <MapPin className="w-5 h-5" />
        <p>This helps us customize your experience.</p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="country" className="text-gray-700">Country</Label>
        <Select value={country} onValueChange={onCountryChange}>
          <SelectTrigger 
            id="country" 
            className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-0 transition-colors"
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
    </div>
  );
}