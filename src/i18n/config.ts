import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import commonEn from './locales/en/common.json';
import commonEs from './locales/es/common.json';

import authEn from './locales/en/auth.json';
import authEs from './locales/es/auth.json';

import dashboardEn from './locales/en/dashboard.json';
import dashboardEs from './locales/es/dashboard.json';

import investmentsEn from './locales/en/investments.json';
import investmentsEs from './locales/es/investments.json';

import profileEn from './locales/en/profile.json';
import profileEs from './locales/es/profile.json';

import accountEn from './locales/en/account.json';

import settingsEn from './locales/en/settings.json';
import settingsEs from './locales/es/settings.json';

import categoriesEn from './locales/en/categories.json';
import categoriesEs from './locales/es/categories.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
] as const;

// Kept as a union for backward compatibility with persisted user preferences,
// but the app is forced to render in English only.
export type SupportedLanguage = 'en' | 'es';

const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    dashboard: dashboardEn,
    investments: investmentsEn,
    profile: profileEn,
    account: accountEn,
    settings: settingsEn,
    categories: categoriesEn,
  },
  es: {
    common: commonEs,
    auth: authEs,
    dashboard: dashboardEs,
    investments: investmentsEs,
    profile: profileEs,
    account: accountEn,
    settings: settingsEs,
    categories: categoriesEs,
  },
};

// Map countries to their primary language
export const COUNTRY_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  // Spanish-speaking countries
  ES: 'es', AR: 'es', MX: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', 
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', PR: 'es',
  // English-speaking countries (and default)
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'investments', 'profile', 'account', 'settings', 'categories'],
    interpolation: {
      escapeValue: false,
    },
  });

// Always force English regardless of any previously cached preference.
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('i18nextLng', 'en');
  }
} catch {
  // ignore (e.g., privacy mode)
}

export default i18n;
