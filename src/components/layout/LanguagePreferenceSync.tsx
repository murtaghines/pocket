import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";

/**
 * Applies the saved user language preference after authentication.
 * (No UI — this replaces the old post-login prompt.)
 */
export function LanguagePreferenceSync() {
  const { user } = useAuth();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!user || prefsLoading) return;
    // Ensure we only apply once preferences exist (not the fallback object).
    if (!preferences?.id) return;

    const savedLangRaw = (preferences.language || "en").split("-")[0];
    const savedLang =
      (SUPPORTED_LANGUAGES.find((l) => l.code === savedLangRaw)?.code ||
        "en") as SupportedLanguage;

    const currentLang = (i18n.language?.split("-")[0] || "en") as SupportedLanguage;
    if (currentLang === savedLang) return;

    i18n.changeLanguage(savedLang);
    localStorage.setItem("i18nextLng", savedLang);
  }, [user, prefsLoading, preferences?.id, preferences?.language, i18n]);

  return null;
}
