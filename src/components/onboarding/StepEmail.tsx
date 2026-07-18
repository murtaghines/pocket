import { useEffect, useState } from 'react';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { EmailInput } from '@/components/ui/email-input';
import { supabase } from '@/integrations/supabase/client';

interface StepEmailProps {
  email: string;
  onEmailChange: (email: string) => void;
  onValidChange: (valid: boolean) => void;
  onAvailabilityChange?: (available: boolean) => void;
}

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export function StepEmail({ email, onEmailChange, onValidChange, onAvailabilityChange }: StepEmailProps) {
  const [formatValid, setFormatValid] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    onAvailabilityChange?.(status === 'available');
  }, [status, onAvailabilityChange]);

  // Combined validity: format + available
  useEffect(() => {
    onValidChange(formatValid && status === 'available');
  }, [formatValid, status, onValidChange]);

  // Debounced check when email + format change
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
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Mail className="w-5 h-5" />
        <p>We'll use this to keep your account secure.</p>
      </div>

      <div className="space-y-2">
        <EmailInput
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onValidChange={setFormatValid}
          autoFocus
          required
          className="w-full h-14 px-4 text-base text-foreground bg-white border border-border rounded-xl focus:border-foreground/30 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
        />

        {formatValid && status === 'checking' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking availability...
          </p>
        )}
        {status === 'available' && (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="w-4 h-4" />
            Email available
          </p>
        )}
        {status === 'taken' && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            An account with this email already exists. Try logging in instead.
          </p>
        )}
        {status === 'error' && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Couldn't verify email. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
