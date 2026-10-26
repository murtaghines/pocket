import { useTranslation } from 'react-i18next';

interface StepSharedFinancesProps {
  hasSharedAccount: boolean | null;
  coHolderName: string;
  onHasSharedAccountChange: (has: boolean) => void;
  onCoHolderNameChange: (name: string) => void;
}

const inputClasses = "w-full h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium text-foreground focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";

export function StepSharedFinances({ hasSharedAccount, coHolderName, onHasSharedAccountChange, onCoHolderNameChange }: StepSharedFinancesProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onHasSharedAccountChange(true)}
          className={`flex-1 px-4 py-3.5 rounded-xl border-[1.5px] transition-colors text-sm font-medium ${
            hasSharedAccount === true
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-transparent bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          {t('onboarding.step7.yes')}
        </button>
        <button
          type="button"
          onClick={() => onHasSharedAccountChange(false)}
          className={`flex-1 px-4 py-3.5 rounded-xl border-[1.5px] transition-colors text-sm font-medium ${
            hasSharedAccount === false
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-transparent bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          {t('onboarding.step7.no')}
        </button>
      </div>

      {hasSharedAccount && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('onboarding.step7.nameHint')}
          </p>
          <input
            type="text"
            placeholder={t('onboarding.step7.placeholder')}
            value={coHolderName}
            onChange={(e) => onCoHolderNameChange(e.target.value)}
            className={inputClasses}
          />
        </div>
      )}
    </div>
  );
}
