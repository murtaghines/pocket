import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import commonEn from './locales/en/common.json';
import commonEs from './locales/es/common.json';
import commonPt from './locales/pt/common.json';

import authEn from './locales/en/auth.json';
import authEs from './locales/es/auth.json';
import authPt from './locales/pt/auth.json';

import dashboardEn from './locales/en/dashboard.json';
import dashboardEs from './locales/es/dashboard.json';
import dashboardPt from './locales/pt/dashboard.json';

import investmentsEn from './locales/en/investments.json';
import investmentsEs from './locales/es/investments.json';
import investmentsPt from './locales/pt/investments.json';

import profileEn from './locales/en/profile.json';
import profileEs from './locales/es/profile.json';
import profilePt from './locales/pt/profile.json';

import settingsEn from './locales/en/settings.json';
import settingsEs from './locales/es/settings.json';
import settingsPt from './locales/pt/settings.json';

import categoriesEn from './locales/en/categories.json';
import categoriesEs from './locales/es/categories.json';
import categoriesPt from './locales/pt/categories.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];

const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    dashboard: dashboardEn,
    investments: investmentsEn,
    profile: profileEn,
    settings: settingsEn,
    categories: categoriesEn,
  },
  es: {
    common: commonEs,
    auth: authEs,
    dashboard: dashboardEs,
    investments: investmentsEs,
    profile: profileEs,
    settings: settingsEs,
    categories: categoriesEs,
  },
  pt: {
    common: commonPt,
    auth: authPt,
    dashboard: dashboardPt,
    investments: investmentsPt,
    profile: profilePt,
    settings: settingsPt,
    categories: categoriesPt,
  },
};

// Map countries to their primary language
export const COUNTRY_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  // Spanish-speaking countries
  ES: 'es', AR: 'es', MX: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', 
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', PR: 'es',
  // Portuguese-speaking countries
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
  // English-speaking countries (and default)
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'investments', 'profile', 'settings', 'categories'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (lng: string) => {
        // Extract base language (e.g., 'es-MX' -> 'es')
        const baseLang = lng.split('-')[0];
        // Check if it's a supported language
        const supported = SUPPORTED_LANGUAGES.find(l => l.code === baseLang);
        return supported ? baseLang : 'en';
      },
    },
  });

export default i18n;
