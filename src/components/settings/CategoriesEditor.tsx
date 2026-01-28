import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { CategoryIcon } from '@/components/ui/category-icon';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from '@/lib/categoryTranslations';

export function CategoriesEditor() {
  const { t } = useTranslation('settings');
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  
  // Parse selected categories from preferences
  const parseCategories = () => {
    const selected = preferences.selected_categories || [];
    const income: string[] = [];
    const expense: string[] = [];
    
    selected.forEach(cat => {
      if (INCOME_CATEGORIES.includes(cat)) {
        income.push(cat);
      } else if (EXPENSE_CATEGORIES.includes(cat)) {
        expense.push(cat);
      }
    });
    
    // If no categories were saved, use defaults
    if (income.length === 0 && expense.length === 0) {
      return {
        income: DEFAULT_INCOME_CATEGORIES,
        expense: DEFAULT_EXPENSE_CATEGORIES,
      };
    }
    
    return { income, expense };
  };
  
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const parsed = parseCategories();
    setIncomeCategories(parsed.income);
    setExpenseCategories(parsed.expense);
    setHasChanges(false);
  }, [preferences.selected_categories]);

  const toggleIncomeCategory = (categorySlug: string) => {
    if (categorySlug === 'other_income') return;
    
    setIncomeCategories(prev => {
      const newCategories = prev.includes(categorySlug)
        ? prev.filter(c => c !== categorySlug)
        : [...prev, categorySlug];
      setHasChanges(true);
      return newCategories;
    });
  };

  const toggleExpenseCategory = (categorySlug: string) => {
    if (categorySlug === 'other_expense') return;
    
    setExpenseCategories(prev => {
      const newCategories = prev.includes(categorySlug)
        ? prev.filter(c => c !== categorySlug)
        : [...prev, categorySlug];
      setHasChanges(true);
      return newCategories;
    });
  };

  const handleSave = () => {
    // Ensure "other" categories are always included
    const finalIncome = incomeCategories.includes('other_income') 
      ? incomeCategories 
      : [...incomeCategories, 'other_income'];
    const finalExpense = expenseCategories.includes('other_expense') 
      ? expenseCategories 
      : [...expenseCategories, 'other_expense'];
    
    const allCategories = [...finalIncome, ...finalExpense];
    
    updatePreferences({
      selected_categories: allCategories,
    }, {
      onSuccess: () => {
        toast.success(t('categories.categoriesSaved'));
        setHasChanges(false);
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    });
  };

  const selectAllIncome = () => {
    setIncomeCategories([...INCOME_CATEGORIES]);
    setHasChanges(true);
  };

  const deselectAllIncome = () => {
    setIncomeCategories(['other_income']);
    setHasChanges(true);
  };

  const selectAllExpense = () => {
    setExpenseCategories([...EXPENSE_CATEGORIES]);
    setHasChanges(true);
  };

  const deselectAllExpense = () => {
    setExpenseCategories(['other_expense']);
    setHasChanges(true);
  };

  const renderCategoryGrid = (
    categories: string[],
    selectedCategories: string[],
    toggleFn: (slug: string) => void,
    alwaysIncludedSlug: string
  ) => (
    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
      {categories.map((slug) => {
        const isChecked = selectedCategories.includes(slug);
        const isDisabled = slug === alwaysIncludedSlug;

        return (
          <div
            key={slug}
            className={`flex items-center space-x-2 p-2 rounded-md border transition-colors text-sm ${
              isChecked
                ? 'bg-primary/5 border-primary/20'
                : 'bg-background hover:bg-muted/50'
            } ${isDisabled ? 'opacity-70' : 'cursor-pointer'}`}
            onClick={() => !isDisabled && toggleFn(slug)}
          >
            <Checkbox
              id={`edit-${slug}`}
              checked={isChecked}
              disabled={isDisabled}
              onCheckedChange={() => toggleFn(slug)}
              className="h-4 w-4"
            />
            <Label
              htmlFor={`edit-${slug}`}
              className={`flex items-center gap-1.5 text-xs ${isDisabled ? '' : 'cursor-pointer'}`}
            >
              <CategoryIcon 
                iconName={getCategoryIcon(slug)} 
                colorVar={getCategoryColor(slug)} 
                size="sm"
              />
              <span className="truncate">{getCategoryLabel(slug)}</span>
            </Label>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card variant="settings">
      <CardHeader className="pb-4">
        <p className="text-sm text-muted-foreground">
          {t('categories.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="income" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income" className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              {t('categories.income')} ({incomeCategories.length})
            </TabsTrigger>
            <TabsTrigger value="expense" className="flex items-center gap-1.5 text-xs">
              <TrendingDown className="w-3.5 h-3.5" />
              {t('categories.expenses')} ({expenseCategories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="mt-3 space-y-2">
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={selectAllIncome} className="text-xs h-7 px-2">
                {t('categories.selectAll')}
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAllIncome} className="text-xs h-7 px-2">
                {t('categories.deselectAll')}
              </Button>
            </div>
            {renderCategoryGrid(
              INCOME_CATEGORIES,
              incomeCategories,
              toggleIncomeCategory,
              'other_income'
            )}
          </TabsContent>

          <TabsContent value="expense" className="mt-3 space-y-2">
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={selectAllExpense} className="text-xs h-7 px-2">
                {t('categories.selectAll')}
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAllExpense} className="text-xs h-7 px-2">
                {t('categories.deselectAll')}
              </Button>
            </div>
            {renderCategoryGrid(
              EXPENSE_CATEGORIES,
              expenseCategories,
              toggleExpenseCategory,
              'other_expense'
            )}
          </TabsContent>
        </Tabs>

        <Button 
          onClick={handleSave} 
          disabled={isUpdating || !hasChanges} 
          className="w-full"
          variant={hasChanges ? "default" : "secondary"}
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('regional.saving')}
            </>
          ) : hasChanges ? (
            t('categories.saveCategories')
          ) : (
            t('categories.noChanges')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
