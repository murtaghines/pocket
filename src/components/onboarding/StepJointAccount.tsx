import { Users, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface StepJointAccountProps {
  jointAccountNames: string[];
  onJointAccountNamesChange: (names: string[]) => void;
}

export function StepJointAccount({ jointAccountNames, onJointAccountNamesChange }: StepJointAccountProps) {
  const [enabled, setEnabled] = useState(jointAccountNames.length > 0);
  const [newName, setNewName] = useState('');

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onJointAccountNamesChange([]);
    }
  };

  const addName = () => {
    const trimmed = newName.trim();
    if (trimmed && !jointAccountNames.includes(trimmed)) {
      onJointAccountNamesChange([...jointAccountNames, trimmed]);
      setNewName('');
    }
  };

  const removeName = (name: string) => {
    onJointAccountNamesChange(jointAccountNames.filter(n => n !== name));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-gray-500">
        <Users className="w-5 h-5" />
        <p className="text-sm">Add co-holders to track shared expenses together. You can skip this step.</p>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <span className="text-sm font-medium text-gray-700">I share finances with someone</span>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Co-holder name..."
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

          {jointAccountNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {jointAccountNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-primary text-white"
                >
                  {name}
                  <button type="button" onClick={() => removeName(name)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
