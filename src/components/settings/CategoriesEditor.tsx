import { useState } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';
import { useCategorizationRules } from '@/hooks/useCategorizationRules';
import { CategoryRulesList } from './CategoryRulesList';
import { AddRuleDialog } from './AddRuleDialog';
import { CustomCategoriesManager } from './CustomCategoriesManager';
import type { Database } from '@/integrations/supabase/types';

type Rule = Database["public"]["Tables"]["categorization_rules"]["Row"];

interface RuleDialogState {
  categoryId: string;
  categoryName: string;
  editingRule?: { id: string; pattern: string; matchType: string } | null;
}

export function CategoriesEditor() {
  const { t } = useTranslation('settings');
  const { incomeCategories, expenseCategories, isLoading: catsLoading } = useCategories('CASHFLOW');
  const { rules, isLoading: rulesLoading, addRule, updateRule, deleteRule, getRulesForCategory } = useCategorizationRules();
  const [dialogState, setDialogState] = useState<RuleDialogState | null>(null);

  const isLoading = catsLoading || rulesLoading;

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

  return (
    <div className="space-y-8">
      {/* Info banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/50">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('categories.alwaysActiveNote', 'These categories are always active. Pocket automatically assigns them based on your transaction descriptions. You can add custom rules to fine-tune how transactions are categorized.')}
        </p>
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
            <span className="text-xs text-muted-foreground">({incomeCategories.length})</span>
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
            <span className="text-xs text-muted-foreground">({expenseCategories.length})</span>
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
            />
          )}
        </div>
      </div>

      {/* Custom Categories */}
      <div className="border-t pt-6">
        <CustomCategoriesManager />
      </div>

      <AddRuleDialog
        open={!!dialogState}
        categoryName={dialogState?.categoryName || ''}
        editingRule={dialogState?.editingRule}
        onClose={() => setDialogState(null)}
        onSave={handleSave}
        isSaving={addRule.isPending || updateRule.isPending}
      />
    </div>
  );
}
