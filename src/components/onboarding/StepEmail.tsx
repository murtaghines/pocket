import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { EmailInput } from '@/components/ui/email-input';
import { supabase } from '@/integrations/supabase/client';

interface StepEmailProps {
  email: string;
  onEmailChange: (email: string) => void;
  onValidChange: (valid: boolean) => void;
  onAvailabilityChange?: (available: boolean) => void;
}

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const inputClasses = "w-full h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-none";

export function StepEmail({ email, onEmailChange, onValidChange, onAvailabilityChange }: StepEmailProps) {
  const { t } = useTranslation('auth');
  const [formatValid, setFormatValid] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    onAvailabilityChange?.(status === 'available');
  }, [status, onAvailabilityChange]);

  useEffect(() => {
    onValidChange(formatValid && status === 'available');
  }, [formatValid, status, onValidChange]);

  useEffect(() => {
    if (!formatValid) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    const normalized = email.trim().toLowerCase();
    const handle = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-email-availability', {
          body: { email: normalized },
        });
        if (error) {
          setStatus('error');
          return;
        }
        setStatus(data?.exists ? 'taken' : 'available');
      } catch {
        setStatus('error');
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [email, formatValid]);

  return (
    <div className="space-y-2">
      <EmailInput
        placeholder={t('placeholders.email')}
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        onValidChange={setFormatValid}
        autoFocus
        required
        className={inputClasses}
      />

      {formatValid && status === 'checking' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('onboarding.emailStatus.checking')}
        </p>
      )}
      {status === 'available' && (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="w-4 h-4" />
          {t('onboarding.emailStatus.available')}
        </p>
      )}
      {status === 'taken' && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          {t('onboarding.emailStatus.taken')}
        </p>
      )}
      {status === 'error' && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          {t('onboarding.emailStatus.error')}
        </p>
      )}
    </div>
  );
}
