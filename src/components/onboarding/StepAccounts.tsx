import { Building2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface StepAccountsProps {
  accountNames: string[];
  onAccountNamesChange: (names: string[]) => void;
}

export function StepAccounts({ accountNames, onAccountNamesChange }: StepAccountsProps) {
  const [newName, setNewName] = useState('');

  const addName = () => {
    const trimmed = newName.trim();
    if (trimmed && !accountNames.includes(trimmed)) {
      onAccountNamesChange([...accountNames, trimmed]);
      setNewName('');
    }
  };

  const removeName = (name: string) => {
    onAccountNamesChange(accountNames.filter(n => n !== name));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-gray-500">
        <Building2 className="w-5 h-5" />
        <p className="text-sm">Add the bank accounts or cards you'll track. You can always add more later.</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="e.g. Santander, BBVA, Revolut..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addName())}
            className="flex-1 h-10 text-sm border border-gray-200 rounded-xl"
          />
          <button
            type="button"
            onClick={addName}
            disabled={!newName.trim()}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {accountNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {accountNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-primary text-white"
              >
                <Building2 className="w-3 h-3" />
                {name}
                <button type="button" onClick={() => removeName(name)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {accountNames.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No accounts added yet — you can skip this and add them when uploading files.
          </p>
        )}
      </div>
    </div>
  );
}
