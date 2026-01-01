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
        <p>Select your <strong>base currency</strong> — the primary currency you'll use to upload transactions and compare values.</p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="currency">Base Currency</Label>
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

      <div className="p-4 rounded-lg bg-muted/50 space-y-2">
        <p className="text-sm">
          <strong>💡 How it works:</strong>
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>All exchange rate comparisons will use <strong>{data.currency}</strong> as reference</li>
          <li>You can view your dashboard in any currency later</li>
          <li>Bank statements can be uploaded in any currency</li>
        </ul>
      </div>
    </div>
  );
}
