import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { SUPPORTED_CURRENCIES, getCurrencyByCode } from '@/lib/currencies';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencySelectorProps {
  variant?: 'light' | 'dark';
}

export function CurrencySelector({ variant = 'light' }: CurrencySelectorProps) {
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
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

  const isDark = variant === 'dark';

  return (
    <div className="flex items-center gap-2">
      {/* Exchange rate indicator */}
      {currentCurrency !== 'EUR' && (
        <span className={cn(
          "text-xs hidden sm:inline whitespace-nowrap",
          isDark ? "text-white/60" : "text-muted-foreground"
        )}>
          1 EUR = {formattedRate} {currentCurrency}
        </span>
      )}
      
      <div className="pk-select-wrap relative flex items-center">
        <select
          value={currentCurrency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          disabled={isUpdating}
          className={cn(
            "h-9 pl-3 pr-8 rounded-md text-sm font-mono",
            isDark
              ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
              : "bg-muted text-foreground border-border hover:bg-muted/80",
            isUpdating && "opacity-60 cursor-not-allowed"
          )}
        >
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.symbol} {currency.code}
            </option>
          ))}
        </select>
        {isUpdating && (
          <Loader2 className="w-3 h-3 animate-spin absolute right-2 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
