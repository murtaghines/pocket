import { useTranslation } from 'react-i18next';

interface StepBankProps {
  bankName: string;
  onBankNameChange: (name: string) => void;
}

const inputClasses = "w-full h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium text-foreground focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";

export function StepBank({ bankName, onBankNameChange }: StepBankProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder={t('onboarding.step7.placeholder')}
        value={bankName}
        onChange={(e) => onBankNameChange(e.target.value)}
        className={inputClasses}
      />
    </div>
  );
}
