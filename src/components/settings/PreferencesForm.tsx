import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLocalization } from '@/hooks/useLocalization';
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, getLocaleForLanguage } from '@/lib/currencies';
import { toast } from 'sonner';
import { Globe, DollarSign, Loader2 } from 'lucide-react';

export function PreferencesForm() {
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { formatCurrency, t } = useLocalization();
  
  const [currency, setCurrency] = useState(preferences.base_currency);
  const [language, setLanguage] = useState(preferences.language);

  // Update local state when preferences change
  useEffect(() => {
    setCurrency(preferences.base_currency);
    setLanguage(preferences.language);
  }, [preferences.base_currency, preferences.language]);

  const handleSave = () => {
    updatePreferences({
      base_currency: currency,
      language: language,
      locale: getLocaleForLanguage(language),
    }, {
      onSuccess: () => {
        toast.success(t('profile.preferences_saved'));
      },
      onError: (error) => {
        toast.error(`${t('common.error')}: ${error.message}`);
      },
    });
  };

  // Preview values
  const previewAmount = 1234.56;
  const previewLocale = getLocaleForLanguage(language);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t('profile.regional_settings')}
        </CardTitle>
        <CardDescription>
          {t('profile.regional_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('profile.language')}
          </Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Base Currency */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('profile.currency')}
          </Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code} - {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t('profile.preview')}
          </p>
          <div className="text-lg font-medium">
            {new Intl.NumberFormat(previewLocale, {
              style: 'currency',
              currency: currency,
            }).format(previewAmount)}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isUpdating} className="w-full">
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('profile.saving')}
            </>
          ) : (
            t('profile.save_preferences')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
