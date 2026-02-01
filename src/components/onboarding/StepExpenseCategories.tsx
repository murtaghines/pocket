import { TrendingDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/categoryTranslations';

interface StepExpenseCategoriesProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export function StepExpenseCategories({ selectedCategories, onCategoriesChange }: StepExpenseCategoriesProps) {
  const { t } = useTranslation('categories');

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <TrendingDown className="w-5 h-5" />
        <p>Select the expense categories you want to track.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
        {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
          <div
            key={category}
            className={`flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors ${
              selectedCategories.includes(category)
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => toggleCategory(category)}
          >
            <Checkbox
              id={`expense-${category}`}
              checked={selectedCategories.includes(category)}
              onCheckedChange={() => toggleCategory(category)}
              className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label
              htmlFor={`expense-${category}`}
              className="flex-1 cursor-pointer text-sm font-medium text-gray-900"
            >
              {t(`expense.${category}`, category)}
            </Label>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedCategories.length} categories selected
      </p>
    </div>
  );
}
