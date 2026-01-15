import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLocalization } from '@/hooks/useLocalization';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { toast } from 'sonner';
import { Globe, DollarSign, Loader2 } from 'lucide-react';

export function PreferencesForm() {
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { formatCurrency } = useLocalization();
  
  const [currency, setCurrency] = useState(preferences.base_currency);

  // Update local state when preferences change
  useEffect(() => {
    setCurrency(preferences.base_currency);
  }, [preferences.base_currency]);

  const handleSave = () => {
    updatePreferences({
      base_currency: currency,
    }, {
      onSuccess: () => {
        toast.success('Preferences saved');
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    });
  };

  // Preview values
  const previewAmount = 1234.56;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Regional Settings
        </CardTitle>
        <CardDescription>
          Configure your currency preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base Currency */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Base Currency
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
            Preview:
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
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
