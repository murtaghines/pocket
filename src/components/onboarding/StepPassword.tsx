import { Lock } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';

interface StepPasswordProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (confirmPassword: string) => void;
}

export function StepPassword({ 
  password, 
  confirmPassword, 
  onPasswordChange, 
  onConfirmPasswordChange 
}: StepPasswordProps) {
  return (
    <div className="space-y-4">

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <PasswordInput
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            minLength={6}
            autoFocus
            className="w-full h-14 px-4 text-base text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
          />
          <PasswordStrengthIndicator password={password} />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <PasswordInput
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            required
            minLength={6}
            className="w-full h-14 px-4 text-base text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
          />
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-sm text-destructive">Passwords don't match</p>
          )}
        </div>
      </div>
    </div>
  );
}
