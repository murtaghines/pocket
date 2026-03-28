import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { toast } from 'sonner';
import { DollarSign, Languages, Loader2, Users } from 'lucide-react';

interface PreferencesFormProps {
  className?: string;
}

export function PreferencesForm({ className }: PreferencesFormProps) {
  const { t } = useTranslation('settings');
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  
  const [currency, setCurrency] = useState(preferences.base_currency);
  const [language, setLanguage] = useState<string>(currentLanguage);
  const [jointSplit, setJointSplit] = useState<number>(preferences.joint_account_split ?? 50);

  useEffect(() => {
    setCurrency(preferences.base_currency);
  }, [preferences.base_currency]);

  useEffect(() => {
    setLanguage(currentLanguage);
  }, [currentLanguage]);

  useEffect(() => {
    setJointSplit(preferences.joint_account_split ?? 50);
  }, [preferences.joint_account_split]);

  const handleSave = () => {
    const languageChanged = language !== currentLanguage;
    const currencyChanged = currency !== preferences.base_currency;
    const splitChanged = jointSplit !== (preferences.joint_account_split ?? 50);

    if (languageChanged) {
      changeLanguage(language as 'en' | 'es' | 'pt');
    }

    const updates: Record<string, string | number> = {};
    if (currencyChanged) updates.base_currency = currency;
    if (languageChanged) updates.language = language;
    if (splitChanged) updates.joint_account_split = jointSplit;

    if (Object.keys(updates).length === 0) return;

    updatePreferences(updates as any, {
      onSuccess: () => {
        toast.success(t('regional.saved'));
      },
      onError: (error: any) => {
        console.error('Failed to save preferences:', error);
        if (languageChanged && !currencyChanged && !splitChanged) {
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

        {/* Joint Account Split */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('jointAccount.splitPercentage')}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={100}
              value={jointSplit}
              onChange={(e) => setJointSplit(Math.min(100, Math.max(1, Number(e.target.value))))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('jointAccount.splitHelp')}
          </p>
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
