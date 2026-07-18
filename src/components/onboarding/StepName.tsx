import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StepNameProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (name: string) => void;
  onLastNameChange: (name: string) => void;
}

export function StepName({ firstName, lastName, onFirstNameChange, onLastNameChange }: StepNameProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <User className="w-5 h-5" />
        <p>Let us know how to address you.</p>
      </div>

      <div className="space-y-3">
        <Input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          autoFocus
          className="w-full h-14 px-4 text-base text-foreground bg-white border border-border rounded-xl focus:border-foreground/30 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          className="w-full h-14 px-4 text-base text-foreground bg-white border border-border rounded-xl focus:border-foreground/30 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
