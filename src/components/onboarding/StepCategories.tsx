import { OnboardingData } from './OnboardingModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  categoryEmojis,
  getCategoryLabel,
} from '@/lib/categoryTranslations';
import { useTranslation } from 'react-i18next';

interface StepCategoriesProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepCategories({ data, updateData }: StepCategoriesProps) {
  const { t } = useTranslation('settings');
  
  // Split categories into income and expense
  const incomeCategories = data.incomeCategories || [];
  const expenseCategories = data.expenseCategories || [];

  const toggleIncomeCategory = (categorySlug: string) => {
    // 'other_income' is always included
    if (categorySlug === 'other_income') return;

    const current = incomeCategories;
    const newCategories = current.includes(categorySlug)
      ? current.filter((c) => c !== categorySlug)
      : [...current, categorySlug];

    updateData({ incomeCategories: newCategories });
  };

  const toggleExpenseCategory = (categorySlug: string) => {
    // 'other_expense' is always included
    if (categorySlug === 'other_expense') return;

    const current = expenseCategories;
    const newCategories = current.includes(categorySlug)
      ? current.filter((c) => c !== categorySlug)
      : [...current, categorySlug];

    updateData({ expenseCategories: newCategories });
  };

  const renderCategoryGrid = (
    categories: string[],
    selectedCategories: string[],
    toggleFn: (slug: string) => void,
    alwaysIncludedSlug: string
  ) => (
    <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2">
      {categories.map((slug) => {
        const isChecked = selectedCategories.includes(slug);
        const isDisabled = slug === alwaysIncludedSlug;

        return (
          <div
            key={slug}
            className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              isChecked
                ? 'bg-primary/5 border-primary/20'
                : 'bg-background hover:bg-muted/50'
            } ${isDisabled ? 'opacity-70' : 'cursor-pointer'}`}
            onClick={() => !isDisabled && toggleFn(slug)}
          >
            <Checkbox
              id={slug}
              checked={isChecked}
              disabled={isDisabled}
              onCheckedChange={() => toggleFn(slug)}
            />
            <Label
              htmlFor={slug}
              className={`flex items-center gap-2 ${isDisabled ? '' : 'cursor-pointer'}`}
            >
              <span>{categoryEmojis[slug] || '📌'}</span>
              <span className="text-sm">
                {getCategoryLabel(slug)}
                {isDisabled && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({t('onboarding.alwaysIncluded')})
                  </span>
                )}
              </span>
            </Label>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t('onboarding.income')}
          </TabsTrigger>
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            {t('onboarding.expenses')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('onboarding.selectIncomeCategories')}
          </p>
          {renderCategoryGrid(
            INCOME_CATEGORIES,
            incomeCategories,
            toggleIncomeCategory,
            'other_income'
          )}
          <p className="text-sm text-muted-foreground">
            {t('onboarding.selected', { count: incomeCategories.length })}
          </p>
        </TabsContent>

        <TabsContent value="expense" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('onboarding.selectExpenseCategories')}
          </p>
          {renderCategoryGrid(
            EXPENSE_CATEGORIES,
            expenseCategories,
            toggleExpenseCategory,
            'other_expense'
          )}
          <p className="text-sm text-muted-foreground">
            {t('onboarding.selected', { count: expenseCategories.length })}
          </p>
        </TabsContent>
      </Tabs>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          🎉 {t('onboarding.almostDone')}
        </p>
      </div>
    </div>
  );
}
