import { Mail } from 'lucide-react';
import { EmailInput } from '@/components/ui/email-input';

interface StepEmailProps {
  email: string;
  onEmailChange: (email: string) => void;
  onValidChange: (valid: boolean) => void;
}

export function StepEmail({ email, onEmailChange, onValidChange }: StepEmailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-gray-500">
        <Mail className="w-5 h-5" />
        <p>We'll use this to keep your account secure.</p>
      </div>

      <div className="space-y-3">
        <EmailInput
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onValidChange={onValidChange}
          autoFocus
          required
          className="w-full h-14 px-4 text-base text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}
