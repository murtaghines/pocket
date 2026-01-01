import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  rate_date: string;
}

export function useExchangeRates(baseCurrency: string = 'EUR') {
  const { data: rates, isLoading, error } = useQuery({
    queryKey: ['exchange_rates', baseCurrency],
    queryFn: async (): Promise<Record<string, number>> => {
      // First try to get from the edge function (which caches in DB)
      const { data, error } = await supabase.functions.invoke('get-exchange-rates', {
        body: null,
        method: 'GET',
      });

      // Fallback: fetch directly from DB if edge function fails
      if (error || !data?.success) {
        console.log('Falling back to direct DB query for rates');
        const today = new Date().toISOString().split('T')[0];
        const { data: dbRates } = await supabase
          .from('exchange_rates')
          .select('*')
          .eq('base_currency', baseCurrency)
          .eq('rate_date', today);

        if (dbRates && dbRates.length > 0) {
          const rateMap: Record<string, number> = { [baseCurrency]: 1 };
          dbRates.forEach((r: ExchangeRate) => {
            rateMap[r.target_currency] = r.rate;
          });
          return rateMap;
        }

        // Return static fallback rates if no data
        return getStaticFallbackRates(baseCurrency);
      }

      const rateMap: Record<string, number> = { [baseCurrency]: 1 };
      data.rates?.forEach((r: ExchangeRate) => {
        rateMap[r.target_currency] = r.rate;
      });
      return rateMap;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const convertAmount = (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    if (!rates || Object.keys(rates).length === 0) return amount;

    // Both currencies are the same as base
    if (fromCurrency === baseCurrency && toCurrency === baseCurrency) {
      return amount;
    }

    // Converting from base currency to target
    if (fromCurrency === baseCurrency && rates[toCurrency]) {
      return amount * rates[toCurrency];
    }

    // Converting from source to base currency
    if (toCurrency === baseCurrency && rates[fromCurrency]) {
      return amount / rates[fromCurrency];
    }

    // Converting between two non-base currencies (through base)
    if (rates[fromCurrency] && rates[toCurrency]) {
      const amountInBase = amount / rates[fromCurrency];
      return amountInBase * rates[toCurrency];
    }

    // Fallback: return original amount
    console.warn(`No rate found for ${fromCurrency} -> ${toCurrency}`);
    return amount;
  };

  const getRate = (fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return 1;
    if (!rates) return 1;

    if (fromCurrency === baseCurrency && rates[toCurrency]) {
      return rates[toCurrency];
    }

    if (rates[fromCurrency] && rates[toCurrency]) {
      return rates[toCurrency] / rates[fromCurrency];
    }

    return 1;
  };

  return {
    rates: rates || {},
    isLoading,
    error,
    convertAmount,
    getRate,
  };
}

// Static fallback rates (approximate, for when API is unavailable)
function getStaticFallbackRates(baseCurrency: string): Record<string, number> {
  const eurRates: Record<string, number> = {
    EUR: 1,
    USD: 1.08,
    GBP: 0.86,
    ARS: 1150,  // Argentine Peso
    MXN: 18.5,
    COP: 4500,  // Colombian Peso
    CLP: 1020,  // Chilean Peso
    BRL: 5.4,
    CHF: 0.95,
    JPY: 162,
    CAD: 1.47,
    AUD: 1.65,
    PEN: 4.1,   // Peruvian Sol
    UYU: 44,    // Uruguayan Peso
  };

  if (baseCurrency === 'EUR') {
    return eurRates;
  }

  // Convert to the requested base currency
  const baseRate = eurRates[baseCurrency] || 1;
  const converted: Record<string, number> = {};
  Object.entries(eurRates).forEach(([currency, rate]) => {
    converted[currency] = rate / baseRate;
  });
  return converted;
}
