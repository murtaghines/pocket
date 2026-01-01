import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLocalization } from '@/hooks/useLocalization';
import { SUPPORTED_CURRENCIES, SUPPORTED_LOCALES, DATE_FORMATS } from '@/lib/currencies';
import { toast } from 'sonner';
import { Globe, DollarSign, Calendar, Loader2 } from 'lucide-react';

export function PreferencesForm() {
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { formatCurrency, formatDate, t } = useLocalization();
  
  const [currency, setCurrency] = useState(preferences.base_currency);
  const [locale, setLocale] = useState(preferences.locale);
  const [dateFormat, setDateFormat] = useState(preferences.date_format);

  const handleSave = () => {
    const selectedLocale = SUPPORTED_LOCALES.find(l => l.code === locale);
    updatePreferences({
      base_currency: currency,
      locale: locale,
      language: selectedLocale?.language || 'es',
      date_format: dateFormat,
    }, {
      onSuccess: () => {
        toast.success(t('profile.preferences_saved'));
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    });
  };

  // Preview values
  const previewAmount = 1234.56;
  const previewDate = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t('profile.regional_settings')}
        </CardTitle>
        <CardDescription>
          Configura cómo quieres ver las fechas, números y monedas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language/Locale */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('profile.language')}
          </Label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((loc) => (
                <SelectItem key={loc.code} value={loc.code}>
                  {loc.name}
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

        {/* Date Format */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('profile.date_format')}
          </Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((fmt) => (
                <SelectItem key={fmt.code} value={fmt.code}>
                  {fmt.code} ({fmt.example})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Vista previa:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Moneda:</span>
            <span className="font-medium">
              {new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
              }).format(previewAmount)}
            </span>
            <span className="text-muted-foreground">Fecha:</span>
            <span className="font-medium">
              {(() => {
                const formatMap: Record<string, string> = {
                  'DD/MM/YYYY': 'dd/MM/yyyy',
                  'MM/DD/YYYY': 'MM/dd/yyyy',
                  'YYYY-MM-DD': 'yyyy-MM-dd',
                };
                const day = String(previewDate.getDate()).padStart(2, '0');
                const month = String(previewDate.getMonth() + 1).padStart(2, '0');
                const year = previewDate.getFullYear();
                
                if (dateFormat === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
                if (dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
                return `${year}-${month}-${day}`;
              })()}
            </span>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isUpdating} className="w-full">
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            t('profile.save_preferences')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
