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
import { DollarSign, Languages, Loader2, Calendar } from 'lucide-react';

interface PreferencesFormProps {
  className?: string;
}

export function PreferencesForm({ className }: PreferencesFormProps) {
  const { t } = useTranslation('settings');
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  
  const [currency, setCurrency] = useState(preferences.base_currency);
  const [language, setLanguage] = useState<string>(currentLanguage);
  const [dateFormat, setDateFormat] = useState<string>(preferences.date_format ?? 'AUTO');

  useEffect(() => {
    setCurrency(preferences.base_currency);
  }, [preferences.base_currency]);

  useEffect(() => {
    setLanguage(currentLanguage);
  }, [currentLanguage]);

  useEffect(() => {
    setDateFormat(preferences.date_format ?? 'AUTO');
  }, [preferences.date_format]);

  const handleSave = () => {
    const languageChanged = language !== currentLanguage;
    const currencyChanged = currency !== preferences.base_currency;
    const dateFormatChanged = dateFormat !== (preferences.date_format ?? 'AUTO');

    if (languageChanged) {
      changeLanguage(language as 'en' | 'es');
    }

    const updates: Record<string, string | number> = {};
    if (currencyChanged) updates.base_currency = currency;
    if (languageChanged) updates.language = language;
    if (dateFormatChanged) {
      (updates as any).date_format = dateFormat === 'AUTO' ? null : dateFormat;
    }

    if (Object.keys(updates).length === 0) return;

    updatePreferences(updates as any, {
      onSuccess: () => {
        toast.success(t('regional.saved'));
      },
      onError: (error: any) => {
        console.error('Failed to save preferences:', error);
        if (languageChanged && !currencyChanged) {
          toast.success(t('regional.saved'));
        } else {
          toast.error(t('regional.errorSaving', 'Error saving preferences'));
        }
      },
    });
  };

  const previewAmount = 1234.56;

  return (
    <Card className={`${className || ''}`} style={{ boxShadow: 'var(--shadow-card)' }}>
      <CardHeader className="pb-4">
        <p className="text-xs text-muted-foreground">
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

        {/* Date Format */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('regional.dateFormat', { defaultValue: 'Date format' })}
          </Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUTO">
                {t('regional.dateFormatAuto', { defaultValue: 'Auto (based on country)' })}
              </SelectItem>
              <SelectItem value="DMY">DD/MM/YYYY · 28/02/2026</SelectItem>
              <SelectItem value="MDY">MM/DD/YYYY · 02/28/2026</SelectItem>
              <SelectItem value="YMD">YYYY-MM-DD · 2026-02-28</SelectItem>
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
