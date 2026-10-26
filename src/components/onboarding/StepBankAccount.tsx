import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface StepBankAccountProps {
  bankName: string;
  accountNickname: string;
  accountType: string;
  onBankNameChange: (name: string) => void;
  onAccountNicknameChange: (nickname: string) => void;
  onAccountTypeChange: (type: string) => void;
}

const inputClasses = "w-full h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-none";
const selectClasses = "w-full h-11 px-3.5 text-sm font-medium text-foreground bg-muted border-[1.5px] border-transparent rounded-xl shadow-none focus:bg-card focus:border-primary focus:ring-0 focus:outline-none transition-colors";

const ACCOUNT_TYPES = [
  { value: 'CHECKING', key: 'checking' },
  { value: 'SAVINGS', key: 'savings' },
  { value: 'CREDIT_CARD', key: 'creditCard' },
];

export function StepBankAccount({
  bankName,
  accountNickname,
  accountType,
  onBankNameChange,
  onAccountNicknameChange,
  onAccountTypeChange,
}: StepBankAccountProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bankName" className="text-muted-foreground">{t('onboarding.step6.bankName')}</Label>
        <Input
          id="bankName"
          type="text"
          placeholder={t('onboarding.step6.bankNamePlaceholder')}
          value={bankName}
          onChange={(e) => onBankNameChange(e.target.value)}
          autoFocus
          className={inputClasses}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountNickname" className="text-muted-foreground">{t('onboarding.step6.accountNickname')}</Label>
        <Input
          id="accountNickname"
          type="text"
          placeholder={t('onboarding.step6.accountNicknamePlaceholder')}
          value={accountNickname}
          onChange={(e) => onAccountNicknameChange(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountType" className="text-muted-foreground">{t('onboarding.step6.accountType')}</Label>
        <div className="pk-select-wrap">
          <select
            id="accountType"
            value={accountType}
            onChange={(e) => onAccountTypeChange(e.target.value)}
            className={selectClasses}
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {t(`onboarding.step6.${type.key}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
