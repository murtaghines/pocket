import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StepNameProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (name: string) => void;
  onLastNameChange: (name: string) => void;
}

const inputClasses = "w-full h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";

export function StepName({ firstName, lastName, onFirstNameChange, onLastNameChange }: StepNameProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <User className="w-5 h-5" />
        <p>{t('onboarding.step2.hint')}</p>
      </div>

      <div className="space-y-3">
        <Input
          type="text"
          placeholder={t('firstName')}
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          autoFocus
          className={inputClasses}
        />
        <Input
          type="text"
          placeholder={t('lastName')}
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          className={inputClasses}
        />
      </div>
    </div>
  );
}
