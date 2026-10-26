import { useTranslation } from 'react-i18next';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';

interface StepPasswordProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (confirmPassword: string) => void;
}

const inputClasses = "w-full h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-none";

export function StepPassword({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange
}: StepPasswordProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">{t('password')}</label>
          <PasswordInput
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            minLength={6}
            autoFocus
            className={inputClasses}
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">{t('confirmPassword')}</label>
          <PasswordInput
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            required
            minLength={6}
            className={inputClasses}
          />
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-sm text-destructive">{t('errors.passwordMismatch')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
