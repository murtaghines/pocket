import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StepNameProps {
  name: string;
  onNameChange: (name: string) => void;
}

export function StepName({ name, onNameChange }: StepNameProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <User className="w-5 h-5" />
        <p>Let us know how to address you.</p>
      </div>

      <div className="space-y-3">
        <Input
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
          className="w-full h-14 px-4 text-base text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}
