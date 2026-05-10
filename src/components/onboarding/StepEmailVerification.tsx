import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface StepEmailVerificationProps {
  email: string;
  code: string;
  onCodeChange: (code: string) => void;
  onResend: () => Promise<void> | void;
  resending?: boolean;
}

export function StepEmailVerification({
  email,
  code,
  onCodeChange,
  onResend,
  resending = false,
}: StepEmailVerificationProps) {
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    await onResend();
    setCooldown(30);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 text-gray-500">
        <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <p className="text-sm">
          We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>. Enter it below to verify your email.
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={onCodeChange}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className="h-14 w-12 text-lg" />
            <InputOTPSlot index={1} className="h-14 w-12 text-lg" />
            <InputOTPSlot index={2} className="h-14 w-12 text-lg" />
            <InputOTPSlot index={3} className="h-14 w-12 text-lg" />
            <InputOTPSlot index={4} className="h-14 w-12 text-lg" />
            <InputOTPSlot index={5} className="h-14 w-12 text-lg" />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="text-center text-sm text-gray-500">
        Didn't get it?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed inline-flex items-center gap-1"
        >
          {resending && <Loader2 className="w-3 h-3 animate-spin" />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}
