export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
];

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

// Map language to locale for number/date formatting
export function getLocaleForLanguage(language: string): string {
  const localeMap: Record<string, string> = {
    'es': 'es-ES',
    'en': 'en-US',
    'pt': 'pt-BR',
    'fr': 'fr-FR',
    'it': 'it-IT',
    'de': 'de-DE',
  };
  return localeMap[language] || 'en-US';
}

// Map language to date-fns format pattern
export function getDateFormatForLanguage(language: string): string {
  const formatMap: Record<string, string> = {
    'es': 'dd/MM/yyyy',
    'en': 'MM/dd/yyyy',
    'pt': 'dd/MM/yyyy',
    'fr': 'dd/MM/yyyy',
    'it': 'dd/MM/yyyy',
    'de': 'dd.MM.yyyy',
  };
  return formatMap[language] || 'dd/MM/yyyy';
}

export function getCurrencyByCode(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code);
}
