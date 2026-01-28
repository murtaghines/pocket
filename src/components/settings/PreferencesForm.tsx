import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { toast } from 'sonner';
import { DollarSign, Languages, Loader2 } from 'lucide-react';

export function PreferencesForm() {
  const { t } = useTranslation('settings');
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  
  const [currency, setCurrency] = useState(preferences.base_currency);
  const [language, setLanguage] = useState<string>(currentLanguage);

  // Update local state when preferences change
  useEffect(() => {
    setCurrency(preferences.base_currency);
  }, [preferences.base_currency]);

  useEffect(() => {
    setLanguage(currentLanguage);
  }, [currentLanguage]);

  const handleSave = () => {
    // Update language if changed
    if (language !== currentLanguage) {
      changeLanguage(language as 'en' | 'es' | 'pt');
    }

    updatePreferences({
      base_currency: currency,
    }, {
      onSuccess: () => {
        toast.success(t('regional.saved'));
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    });
  };

  // Preview values
  const previewAmount = 1234.56;

  return (
    <Card variant="settings">
      <CardHeader className="pb-4">
        <p className="text-sm text-muted-foreground">
          {t('regional.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {t('regional.language')}
          </Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Base Currency */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('regional.baseCurrency')}
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
            {t('regional.preview')}:
          </p>
          <div className="text-lg font-medium">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
            }).format(previewAmount)}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isUpdating} className="w-full">
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('regional.saving')}
            </>
          ) : (
            t('regional.savePreferences')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
