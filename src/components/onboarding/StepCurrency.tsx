import { Banknote } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';

interface StepCurrencyProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
}

export function StepCurrency({ currency, onCurrencyChange }: StepCurrencyProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-gray-500">
        <Banknote className="w-5 h-5" />
        <p>Your <strong className="text-gray-700">base currency</strong> is the currency used to display all totals and reports.</p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="currency" className="text-gray-700">Base Currency</Label>
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger 
            id="currency" 
            className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-0 transition-colors"
          >
            <SelectValue placeholder="Select your currency" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <span className="font-mono">{c.symbol}</span>
                  <span>{c.code}</span>
                  <span className="text-gray-500">- {c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 rounded-lg bg-gray-50 space-y-2">
        <p className="text-sm font-medium">💡 How it works</p>
        <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>All amounts will be converted to {currency || 'your base currency'}</li>
          <li>You can still upload statements in any currency</li>
          <li>Exchange rates are applied automatically</li>
        </ul>
      </div>
    </div>
  );
}