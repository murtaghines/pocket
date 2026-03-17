import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <Card>
      <CardHeader className="pb-4">
        <p className="text-sm text-muted-foreground">
          {t('categories.description')}
        </p>
        <div className="flex items-start gap-2 mt-2 p-2.5 rounded-md bg-muted/50 border">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            {t('categories.alwaysActiveNote', 'These categories are always active. Pocket automatically assigns them based on your transaction descriptions. You can add custom rules to fine-tune how transactions are categorized.')}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="expense" className="w-full">
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

          <TabsContent value="income" className="mt-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
            ) : (
              <CategoryRulesList
                categories={incomeCategories}
                getRulesForCategory={getRulesForCategory}
                onAddRule={handleAddRule}
                onEditRule={handleEditRule}
                onDeleteRule={(id) => deleteRule.mutate(id)}
              />
            )}
          </TabsContent>

          <TabsContent value="expense" className="mt-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
            ) : (
              <CategoryRulesList
                categories={expenseCategories}
                getRulesForCategory={getRulesForCategory}
                onAddRule={handleAddRule}
                onEditRule={handleEditRule}
                onDeleteRule={(id) => deleteRule.mutate(id)}
              />
            )}
          </TabsContent>
        </Tabs>

        <div className="border-t pt-4">
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
      </CardContent>
    </Card>
  );
}
