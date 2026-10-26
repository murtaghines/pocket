import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { CURRENCIES } from '@/lib/onboardingConstants';

interface StepCurrencyProps {
  currency: string;
  dateFormat: string;
  onCurrencyChange: (currency: string) => void;
  onDateFormatChange: (format: string) => void;
}

const selectClasses = "w-full h-11 px-3.5 text-sm font-medium text-foreground bg-muted border-[1.5px] border-transparent rounded-xl shadow-none focus:bg-card focus:border-primary focus:ring-0 focus:outline-none transition-colors";

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
];

export function StepCurrency({ currency, dateFormat, onCurrencyChange, onDateFormatChange }: StepCurrencyProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currency" className="text-muted-foreground">{t('onboarding.step5.currency')}</Label>
        <div className="pk-select-wrap">
          <select
            id="currency"
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className={selectClasses}
          >
            <option value="" disabled>{t('onboarding.step5.selectCurrency')}</option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateFormat" className="text-muted-foreground">{t('onboarding.step5.dateFormat')}</Label>
        <div className="pk-select-wrap">
          <select
            id="dateFormat"
            value={dateFormat}
            onChange={(e) => onDateFormatChange(e.target.value)}
            className={selectClasses}
          >
            {DATE_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
