import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';

interface StepNameProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (name: string) => void;
  onLastNameChange: (name: string) => void;
}

const inputClasses = "w-full h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-none";

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function StepName({ firstName, lastName, onFirstNameChange, onLastNameChange }: StepNameProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="space-y-3">
      <Input
        type="text"
        placeholder={t('firstName')}
        value={firstName}
        onChange={(e) => onFirstNameChange(capitalize(e.target.value))}
        autoFocus
        className={inputClasses}
      />
      <Input
        type="text"
        placeholder={t('lastName')}
        value={lastName}
        onChange={(e) => onLastNameChange(capitalize(e.target.value))}
        className={inputClasses}
      />
    </div>
  );
}
