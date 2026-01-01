import { OnboardingData } from './OnboardingModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tags } from 'lucide-react';

interface StepCategoriesProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const AVAILABLE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', emoji: '🍔' },
  { id: 'transport', label: 'Transportation', emoji: '🚗' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'bills', label: 'Bills & Utilities', emoji: '📱' },
  { id: 'health', label: 'Health & Wellness', emoji: '🏥' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'subscriptions', label: 'Subscriptions', emoji: '📺' },
  { id: 'housing', label: 'Housing & Rent', emoji: '🏠' },
  { id: 'insurance', label: 'Insurance', emoji: '🛡️' },
  { id: 'savings', label: 'Savings & Investments', emoji: '💰' },
  { id: 'others', label: 'Others', emoji: '📦', disabled: true },
];

export function StepCategories({ data, updateData }: StepCategoriesProps) {
  const toggleCategory = (categoryId: string) => {
    if (categoryId === 'others') return; // Can't uncheck "Others"
    
    const current = data.categories;
    const newCategories = current.includes(categoryId)
      ? current.filter(c => c !== categoryId)
      : [...current, categoryId];
    
    updateData({ categories: newCategories });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Tags className="w-5 h-5" />
        <p>Select the expense categories you want to track. "Others" is always included for uncategorized expenses.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2">
        {AVAILABLE_CATEGORIES.map((category) => {
          const isChecked = data.categories.includes(category.id);
          const isDisabled = category.disabled;

          return (
            <div
              key={category.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                isChecked 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-background hover:bg-muted/50'
              } ${isDisabled ? 'opacity-70' : 'cursor-pointer'}`}
              onClick={() => !isDisabled && toggleCategory(category.id)}
            >
              <Checkbox
                id={category.id}
                checked={isChecked}
                disabled={isDisabled}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label 
                htmlFor={category.id} 
                className={`flex items-center gap-2 ${isDisabled ? '' : 'cursor-pointer'}`}
              >
                <span>{category.emoji}</span>
                <span className="text-sm">{category.label}</span>
              </Label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Selected: {data.categories.length} categories
        </p>
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          🎉 Almost done! Click "Get Started" to begin tracking your finances.
        </p>
      </div>
    </div>
  );
}
