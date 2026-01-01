import { useMemo, useCallback } from 'react';
import { useUserPreferences } from './useUserPreferences';
import { getTranslation } from '@/lib/translations';
import { getLocaleForLanguage, getDateFormatForLanguage } from '@/lib/currencies';
import { format, parseISO } from 'date-fns';
import { es, enUS, ptBR, type Locale } from 'date-fns/locale';

const dateFnsLocales: Record<string, Locale> = {
  es: es,
  en: enUS,
  pt: ptBR,
};

export function useLocalization() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();

  const language = preferences.language;
  const baseCurrency = preferences.base_currency;
  const locale = getLocaleForLanguage(language);

  // Format currency according to user preferences
  const formatCurrency = useCallback((amount: number, currency?: string) => {
    const currencyToUse = currency || baseCurrency;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyToUse,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Fallback for invalid currency codes
      return new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ` ${currencyToUse}`;
    }
  }, [locale, baseCurrency]);

  // Format compact currency (e.g., $1.2k, €500)
  const formatCurrencyCompact = useCallback((amount: number, currency?: string) => {
    const currencyToUse = currency || baseCurrency;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyToUse,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount);
    } catch {
      return new Intl.NumberFormat(locale, {
        style: 'decimal',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount) + ` ${currencyToUse}`;
    }
  }, [locale, baseCurrency]);

  // Format number according to user preferences
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(value);
  }, [locale]);

  // Format percentage
  const formatPercent = useCallback((value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  }, [locale]);

  // Format date according to language
  const formatDate = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const dateFnsLocale = dateFnsLocales[language] || dateFnsLocales['es'];
      const datePattern = getDateFormatForLanguage(language);
      return format(dateObj, datePattern, { locale: dateFnsLocale });
    } catch {
      return String(date);
    }
  }, [language]);

  // Format date with time
  const formatDateTime = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const dateFnsLocale = dateFnsLocales[language] || dateFnsLocales['es'];
      return format(dateObj, 'PPp', { locale: dateFnsLocale });
    } catch {
      return String(date);
    }
  }, [language]);

  // Format relative date (e.g., "3 days ago")
  const formatRelativeDate = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      
      if (diffDays === 0) {
        return rtf.format(0, 'day'); // "today"
      } else if (diffDays < 7) {
        return rtf.format(-diffDays, 'day');
      } else if (diffDays < 30) {
        return rtf.format(-Math.floor(diffDays / 7), 'week');
      } else if (diffDays < 365) {
        return rtf.format(-Math.floor(diffDays / 30), 'month');
      } else {
        return rtf.format(-Math.floor(diffDays / 365), 'year');
      }
    } catch {
      return String(date);
    }
  }, [locale]);

  // Format month name
  const formatMonth = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const dateFnsLocale = dateFnsLocales[language] || dateFnsLocales['es'];
      return format(dateObj, 'MMMM yyyy', { locale: dateFnsLocale });
    } catch {
      return String(date);
    }
  }, [language]);

  // Format short month (e.g., "Ene", "Jan")
  const formatMonthShort = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const dateFnsLocale = dateFnsLocales[language] || dateFnsLocales['es'];
      return format(dateObj, 'MMM', { locale: dateFnsLocale });
    } catch {
      return String(date);
    }
  }, [language]);

  // Translation function
  const t = useCallback((key: string) => {
    return getTranslation(language, key);
  }, [language]);

  return useMemo(() => ({
    // Preferences
    locale,
    language,
    baseCurrency,
    isLoading,
    isUpdating,
    updatePreferences,
    
    // Formatters
    formatCurrency,
    formatCurrencyCompact,
    formatNumber,
    formatPercent,
    formatDate,
    formatDateTime,
    formatRelativeDate,
    formatMonth,
    formatMonthShort,
    
    // Translation
    t,
  }), [
    locale, language, baseCurrency, isLoading, isUpdating, updatePreferences,
    formatCurrency, formatCurrencyCompact, formatNumber, formatPercent,
    formatDate, formatDateTime, formatRelativeDate, formatMonth, formatMonthShort, t
  ]);
}
