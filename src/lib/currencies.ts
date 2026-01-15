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

// Get locale for number/date formatting based on user's region
export function getLocaleForRegion(country?: string): string {
  // Default to US English for formatting
  if (!country) return 'en-US';
  
  const localeMap: Record<string, string> = {
    'ES': 'es-ES',
    'US': 'en-US',
    'GB': 'en-GB',
    'BR': 'pt-BR',
    'FR': 'fr-FR',
    'IT': 'it-IT',
    'DE': 'de-DE',
    'AR': 'es-AR',
    'MX': 'es-MX',
    'CO': 'es-CO',
    'CL': 'es-CL',
    'PE': 'es-PE',
    'UY': 'es-UY',
    'JP': 'ja-JP',
    'CA': 'en-CA',
    'AU': 'en-AU',
    'NZ': 'en-NZ',
    'CH': 'de-CH',
  };
  return localeMap[country] || 'en-US';
}

// Date format pattern (always use standard format)
export function getDateFormat(): string {
  return 'MM/dd/yyyy';
}

export function getCurrencyByCode(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code);
}
