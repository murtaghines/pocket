import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from './useUserPreferences';
import { SUPPORTED_LANGUAGES, COUNTRY_LANGUAGE_MAP, type SupportedLanguage } from '@/i18n/config';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { preferences, updatePreferences, isUpdating, isLoading } = useUserPreferences();
  const hasInitialized = useRef(false);

  // Sync i18n language with user preferences or country
  useEffect(() => {
    if (isLoading || hasInitialized.current) return;

    // Priority: 1) Saved language preference, 2) Country-based language, 3) Browser detection (already done by i18next)
    if (preferences.language && preferences.language !== i18n.language) {
      i18n.changeLanguage(preferences.language);
      hasInitialized.current = true;
    } else if (!preferences.language && preferences.country) {
      // Use country to suggest language if no explicit preference saved
      const countryLang = COUNTRY_LANGUAGE_MAP[preferences.country.toUpperCase()];
      if (countryLang && countryLang !== i18n.language) {
        i18n.changeLanguage(countryLang);
        // Also save this as the user's preference
        updatePreferences({ language: countryLang });
      }
      hasInitialized.current = true;
    }
  }, [preferences.language, preferences.country, i18n, isLoading, updatePreferences]);

  const changeLanguage = useCallback((language: SupportedLanguage) => {
    i18n.changeLanguage(language);
    updatePreferences({ language });
  }, [i18n, updatePreferences]);

  const currentLanguage = (i18n.language || 'en') as SupportedLanguage;
  const currentLanguageInfo = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return {
    currentLanguage,
    currentLanguageInfo,
    changeLanguage,
    isUpdating,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
