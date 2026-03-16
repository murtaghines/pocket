import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from './useUserPreferences';
import { getLocaleForRegion } from '@/lib/currencies';
import { format, parseISO } from 'date-fns';
import { enUS, es, ptBR, type Locale } from 'date-fns/locale';

const dateFnsLocales: Record<string, Locale> = {
  en: enUS,
  es: es,
  pt: ptBR,
};

export function useLocalization() {
  const { i18n } = useTranslation();
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();

  const baseCurrency = preferences.base_currency;
  const locale = getLocaleForRegion(preferences.country);
  const dateFnsLocale: Locale = dateFnsLocales[i18n.language] || enUS;

  // Format currency according to user preferences
  const formatCurrency = useCallback((amount: number, currency?: string) => {
    const currencyToUse = currency || baseCurrency;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyToUse,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: 'always' as any,
      }).format(amount);
    } catch {
      // Fallback for invalid currency codes
      return new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
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
        useGrouping: true,
      }).format(amount);
    } catch {
      return new Intl.NumberFormat(locale, {
        style: 'decimal',
        notation: 'compact',
        maximumFractionDigits: 1,
        useGrouping: true,
      }).format(amount) + ` ${currencyToUse}`;
    }
  }, [locale, baseCurrency]);

  // Format number according to user preferences
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, { useGrouping: true, ...options }).format(value);
  }, [locale]);

  // Format percentage
  const formatPercent = useCallback((value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  }, [locale]);

  // Format date
  const formatDate = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, 'MM/dd/yyyy', { locale: dateFnsLocale });
    } catch {
      return String(date);
    }
  }, [dateFnsLocale]);

  // Format date with time
  const formatDateTime = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, 'PPp', { locale: dateFnsLocale });
    } catch {
      return String(date);
    }
  }, [dateFnsLocale]);

  // Format relative date (e.g., "3 days ago")
  const formatRelativeDate = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      
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
  }, []);

  // Format month name
  const formatMonth = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, 'MMMM yyyy', { locale: dateFnsLocale });
    } catch {
      return String(date);
    }
  }, [dateFnsLocale]);

  // Format short month (e.g., "Jan")
  const formatMonthShort = useCallback((date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, 'MMM', { locale: dateFnsLocale });
    } catch {
      return String(date);
    }
  }, [dateFnsLocale]);

  return useMemo(() => ({
    // Preferences
    locale,
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
  }), [
    locale, baseCurrency, isLoading, isUpdating, updatePreferences,
    formatCurrency, formatCurrencyCompact, formatNumber, formatPercent,
    formatDate, formatDateTime, formatRelativeDate, formatMonth, formatMonthShort
  ]);
}
