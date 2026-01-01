export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
  { code: 'ARS', name: 'Peso argentino', symbol: '$' },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$' },
  { code: 'COP', name: 'Peso colombiano', symbol: '$' },
  { code: 'CLP', name: 'Peso chileno', symbol: '$' },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$' },
  { code: 'CHF', name: 'Franco suizo', symbol: 'CHF' },
  { code: 'JPY', name: 'Yen japonés', symbol: '¥' },
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'C$' },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'A$' },
];

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
];

// Map language to locale for number/date formatting
export function getLocaleForLanguage(language: string): string {
  const localeMap: Record<string, string> = {
    'es': 'es-ES',
    'en': 'en-US',
    'pt': 'pt-BR',
  };
  return localeMap[language] || 'es-ES';
}

// Map language to date-fns format pattern
export function getDateFormatForLanguage(language: string): string {
  const formatMap: Record<string, string> = {
    'es': 'dd/MM/yyyy',
    'en': 'MM/dd/yyyy',
    'pt': 'dd/MM/yyyy',
  };
  return formatMap[language] || 'dd/MM/yyyy';
}

export function getCurrencyByCode(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code);
}
