import { useState } from 'react';
import { TrendingUp, TrendingDown, Info, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';
import { useCategorizationRules } from '@/hooks/useCategorizationRules';
import { useCustomCategories, type CustomCategoryRule } from '@/hooks/useCustomCategories';
import { CategoryRulesList } from './CategoryRulesList';
import { AddRuleDialog } from './AddRuleDialog';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Rule = Database["public"]["Tables"]["categorization_rules"]["Row"];

interface RuleDialogState {
  categoryId: string;
  categoryName: string;
  editingRule?: { id: string; pattern: string; matchType: string } | null;
}

export function CategoriesEditor() {
  const { t } = useTranslation('settings');
  const { toast } = useToast();
  const { incomeCategories, expenseCategories, isLoading: catsLoading } = useCategories('CASHFLOW');
  const { rules, isLoading: rulesLoading, addRule, updateRule, deleteRule, getRulesForCategory } = useCategorizationRules();
  const { customCategories, isSaving, addCustomCategory, removeRule: removeCustomRule, rules: allCustomRules } = useCustomCategories();
  const [dialogState, setDialogState] = useState<RuleDialogState | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  const isLoading = catsLoading || rulesLoading;

  const incomeCustom = customCategories.filter(c => c.movement === 'INCOME');
  const expenseCustom = customCategories.filter(c => c.movement === 'EXPENSE');

  const handleAddRule = (cat: { id: string; name: string }) => {
    setDialogState({ categoryId: cat.id, categoryName: cat.name });
  };

  const handleEditRule = (rule: Rule, cat: { id: string; name: string }) => {
    setDialogState({
      categoryId: cat.id,
      categoryName: cat.name,
      editingRule: { id: rule.id, pattern: rule.pattern, matchType: rule.match_type },
    });
  };

  const handleSave = (pattern: string, matchType: string) => {
    if (!dialogState) return;
    const editing = dialogState.editingRule;
    if (editing) {
      updateRule.mutate(
        { ruleId: editing.id, pattern, match_type: matchType },
        { onSuccess: () => setDialogState(null) }
      );
    } else {
      addRule.mutate(
        { category_id: dialogState.categoryId, pattern, match_type: matchType, match_field: 'description_norm' },
        { onSuccess: () => setDialogState(null) }
      );
    }
  };

  const handleDeleteCustomCategory = async (cat: CustomCategoryRule) => {
    try {
      await removeCustomRule(allCustomRules.indexOf(cat));
      toast({ title: t('categories.ruleDeleted') });
    } catch {
      toast({ title: t('categories.errorSaving', 'Error deleting'), variant: 'destructive' });
    }
  };

  const handleCreateCategory = async (data: Omit<CustomCategoryRule, 'type'>) => {
    try {
      await addCustomCategory(data);
      toast({ title: t('categories.customCategorySaved') });
      setShowCreateCategory(false);
    } catch {
      toast({ title: t('categories.errorSaving', 'Error saving'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2.5 flex-1 mr-4">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('categories.alwaysActiveNote', 'These categories are always active. Pocket automatically assigns them based on your transaction descriptions. You can add custom rules to fine-tune how transactions are categorized.')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 shrink-0 gap-1.5"
          onClick={() => setShowCreateCategory(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          {t('categories.createNewCategory', 'Create new category')}
        </Button>
      </div>

      {/* Side-by-side Income & Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-emerald-500/30">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/10">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight">
              {t('categories.income')}
            </h3>
            <span className="text-xs text-muted-foreground">({incomeCategories.length + incomeCustom.length})</span>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
          ) : (
            <CategoryRulesList
              categories={incomeCategories}
              getRulesForCategory={getRulesForCategory}
              onAddRule={handleAddRule}
              onEditRule={handleEditRule}
              onDeleteRule={(id) => deleteRule.mutate(id)}
              customCategories={incomeCustom}
              onDeleteCustomCategory={handleDeleteCustomCategory}
            />
          )}
        </div>

        {/* Expenses Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-orange-500/30">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10">
              <TrendingDown className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight">
              {t('categories.expenses')}
            </h3>
            <span className="text-xs text-muted-foreground">({expenseCategories.length + expenseCustom.length})</span>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
          ) : (
            <CategoryRulesList
              categories={expenseCategories}
              getRulesForCategory={getRulesForCategory}
              onAddRule={handleAddRule}
              onEditRule={handleEditRule}
              onDeleteRule={(id) => deleteRule.mutate(id)}
              customCategories={expenseCustom}
              onDeleteCustomCategory={handleDeleteCustomCategory}
            />
          )}
        </div>
      </div>

      <AddRuleDialog
        open={!!dialogState}
        categoryName={dialogState?.categoryName || ''}
        editingRule={dialogState?.editingRule}
        onClose={() => setDialogState(null)}
        onSave={handleSave}
        isSaving={addRule.isPending || updateRule.isPending}
      />

      <CreateCategoryDialog
        open={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        onSave={handleCreateCategory}
        isSaving={isSaving}
      />
    </div>
  );
}
