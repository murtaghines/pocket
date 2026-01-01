export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'es-ES' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', locale: 'es-AR' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', locale: 'es-MX' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', locale: 'es-CO' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', locale: 'es-CL' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', locale: 'pt-BR' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
];

export const SUPPORTED_LOCALES = [
  { code: 'es-ES', name: 'Español (España)', language: 'es' },
  { code: 'es-AR', name: 'Español (Argentina)', language: 'es' },
  { code: 'es-MX', name: 'Español (México)', language: 'es' },
  { code: 'es-CO', name: 'Español (Colombia)', language: 'es' },
  { code: 'en-US', name: 'English (US)', language: 'en' },
  { code: 'en-GB', name: 'English (UK)', language: 'en' },
  { code: 'pt-BR', name: 'Português (Brasil)', language: 'pt' },
];

export const DATE_FORMATS = [
  { code: 'DD/MM/YYYY', example: '31/12/2025' },
  { code: 'MM/DD/YYYY', example: '12/31/2025' },
  { code: 'YYYY-MM-DD', example: '2025-12-31' },
];

export function getCurrencyByCode(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code);
}

export function getDefaultLocaleForCurrency(currencyCode: string): string {
  const currency = getCurrencyByCode(currencyCode);
  return currency?.locale || 'en-US';
}
