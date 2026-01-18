import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from './useUserPreferences';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();

  // Sync i18n language with user preferences
  useEffect(() => {
    if (preferences.language && preferences.language !== i18n.language) {
      i18n.changeLanguage(preferences.language);
    }
  }, [preferences.language, i18n]);

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
