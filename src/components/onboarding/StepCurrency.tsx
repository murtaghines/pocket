import { OnboardingData } from './OnboardingModal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { Banknote } from 'lucide-react';

interface StepCurrencyProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepCurrency({ data, updateData }: StepCurrencyProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Banknote className="w-5 h-5" />
        <p>Choose the currency you want to use for your financial overview. All amounts will be converted to this currency.</p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="currency">Display Currency</Label>
        <Select 
          value={data.currency} 
          onValueChange={(value) => updateData({ currency: value })}
        >
          <SelectTrigger id="currency" className="w-full">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                <span className="flex items-center gap-2">
                  <span className="font-mono">{currency.symbol}</span>
                  <span>{currency.code}</span>
                  <span className="text-muted-foreground">- {currency.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm">
          <strong>Note:</strong> Your uploaded bank statements can be in any currency. 
          We'll automatically convert amounts to {data.currency} for a unified view.
        </p>
      </div>
    </div>
  );
}
