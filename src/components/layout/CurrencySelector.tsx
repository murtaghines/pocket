import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { SUPPORTED_CURRENCIES, getCurrencyByCode } from '@/lib/currencies';
import { useLocalization } from '@/hooks/useLocalization';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export function CurrencySelector() {
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { t } = useLocalization();
  const { getRate } = useExchangeRates('EUR');
  
  const currentCurrency = preferences?.base_currency || 'EUR';
  const currencyInfo = getCurrencyByCode(currentCurrency);

  const handleCurrencyChange = (newCurrency: string) => {
    if (newCurrency !== currentCurrency) {
      updatePreferences({ base_currency: newCurrency });
    }
  };

  // Get exchange rate from EUR to current currency
  const rate = getRate('EUR', currentCurrency);
  const formattedRate = rate >= 100 ? Math.round(rate).toLocaleString() : rate.toFixed(2);

  return (
    <div className="flex items-center gap-2">
      {/* Exchange rate indicator */}
      {currentCurrency !== 'EUR' && (
        <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
          1 EUR = {formattedRate} {currentCurrency}
        </span>
      )}
      
      <Select value={currentCurrency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="w-[80px] h-9 gap-1 bg-background border-muted">
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <SelectValue>
              <span className="font-mono text-sm">{currencyInfo?.symbol || currentCurrency}</span>
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {SUPPORTED_CURRENCIES.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <span className="flex items-center gap-2">
                <span className="font-mono w-6">{currency.symbol}</span>
                <span>{currency.code}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
