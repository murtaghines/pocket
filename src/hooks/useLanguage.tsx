import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from './useUserPreferences';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();

  // The language is now primarily controlled by i18next's browser detection
  // We only use preferences.language when the user explicitly changes it via changeLanguage
  // This ensures the browser/OS language takes precedence

  const changeLanguage = useCallback((language: SupportedLanguage) => {
    i18n.changeLanguage(language);
    // Save to localStorage for i18next to persist
    localStorage.setItem('i18nextLng', language);
    // Also save to user preferences for cross-device sync
    updatePreferences({ language });
  }, [i18n, updatePreferences]);

  const currentLanguage = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const currentLanguageInfo = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return {
    currentLanguage,
    currentLanguageInfo,
    changeLanguage,
    isUpdating,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
