import { OnboardingData } from './OnboardingModal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { Banknote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StepCurrencyProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepCurrency({ data, updateData }: StepCurrencyProps) {
  const { t } = useTranslation('settings');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Banknote className="w-5 h-5" />
        <p dangerouslySetInnerHTML={{ __html: t('onboarding.currencyDescription') }} />
      </div>

      <div className="space-y-3">
        <Label htmlFor="currency">{t('regional.baseCurrency')}</Label>
        <Select 
          value={data.currency} 
          onValueChange={(value) => updateData({ currency: value })}
        >
          <SelectTrigger id="currency" className="w-full">
            <SelectValue placeholder={t('onboarding.selectCurrency')} />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                <span className="flex items-center gap-2">
                  <span className="font-mono">{currency.symbol}</span>
                  <span>{currency.code}</span>
                  <span className="text-muted-foreground">- {currency.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 space-y-2">
        <p className="text-sm">
          <strong>💡 {t('onboarding.howItWorks')}</strong>
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>{t('onboarding.currencyHint1', { currency: data.currency })}</li>
          <li>{t('onboarding.currencyHint2')}</li>
          <li>{t('onboarding.currencyHint3')}</li>
        </ul>
      </div>
    </div>
  );
}
