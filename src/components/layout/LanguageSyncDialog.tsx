import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Globe, Monitor } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config';

const SYNC_DISMISSED_KEY = 'language_sync_dismissed';

export function LanguageSyncDialog() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { changeLanguage, currentLanguage } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [browserLanguage, setBrowserLanguage] = useState<SupportedLanguage>('en');
  const [savedLanguage, setSavedLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    if (!user || prefsLoading) return;

    // Get browser language
    const browserLang = navigator.language?.split('-')[0] || 'en';
    const supportedBrowserLang = SUPPORTED_LANGUAGES.find(l => l.code === browserLang)?.code || 'en';
    
    // Get saved language from preferences
    const savedLang = preferences?.language as SupportedLanguage || 'en';
    
    // Check if we've already dismissed this dialog for this session/combination
    const dismissedKey = sessionStorage.getItem(SYNC_DISMISSED_KEY);
    const currentDismissKey = `${supportedBrowserLang}-${savedLang}`;
    
    // Only show dialog if:
    // 1. Languages differ
    // 2. User hasn't dismissed this specific combination
    // 3. Saved language exists and is different from browser
    if (
      supportedBrowserLang !== savedLang && 
      dismissedKey !== currentDismissKey &&
      preferences?.language // Only if there's an explicit saved preference
    ) {
      setBrowserLanguage(supportedBrowserLang as SupportedLanguage);
      setSavedLanguage(savedLang);
      setShowDialog(true);
    }
  }, [user, preferences, prefsLoading]);

  const getLanguageName = (code: SupportedLanguage) => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code)?.nativeName || code;
  };

  const handleUseBrowserLanguage = () => {
    changeLanguage(browserLanguage);
    dismissDialog();
  };

  const handleUseSavedLanguage = () => {
    changeLanguage(savedLanguage);
    dismissDialog();
  };

  const dismissDialog = () => {
    // Remember dismissal for this session
    sessionStorage.setItem(SYNC_DISMISSED_KEY, `${browserLanguage}-${savedLanguage}`);
    setShowDialog(false);
  };

  if (!showDialog) return null;

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t('languageSync.title', 'Language Preference')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              {t('languageSync.description', 'Your browser language differs from your saved preference. Which would you like to use?')}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 px-4"
            onClick={handleUseBrowserLanguage}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
              <Monitor className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-left">
              <div className="font-medium">
                {t('languageSync.useBrowser', 'Use browser language')}
              </div>
              <div className="text-sm text-muted-foreground">
                {getLanguageName(browserLanguage)}
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 px-4"
            onClick={handleUseSavedLanguage}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">
                {t('languageSync.useSaved', 'Use saved preference')}
              </div>
              <div className="text-sm text-muted-foreground">
                {getLanguageName(savedLanguage)}
              </div>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={dismissDialog} className="text-muted-foreground">
            {t('languageSync.decideLater', 'Decide later')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
