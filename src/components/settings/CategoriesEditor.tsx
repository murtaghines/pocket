import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';
import { useCategorizationRules } from '@/hooks/useCategorizationRules';
import { CategoryRulesList } from './CategoryRulesList';
import { AddRuleDialog } from './AddRuleDialog';

export function CategoriesEditor() {
  const { t } = useTranslation('settings');
  const { incomeCategories, expenseCategories, isLoading: catsLoading } = useCategories('CASHFLOW');
  const { rules, isLoading: rulesLoading, addRule, deleteRule, getRulesForCategory } = useCategorizationRules();
  const [addRuleFor, setAddRuleFor] = useState<{ id: string; name: string } | null>(null);

  const isLoading = catsLoading || rulesLoading;

  return (
    <Card>
      <CardHeader className="pb-4">
        <p className="text-sm text-muted-foreground">
          {t('categories.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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
                onAddRule={(cat) => setAddRuleFor({ id: cat.id, name: cat.name })}
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
                onAddRule={(cat) => setAddRuleFor({ id: cat.id, name: cat.name })}
                onDeleteRule={(id) => deleteRule.mutate(id)}
              />
            )}
          </TabsContent>
        </Tabs>

        <AddRuleDialog
          open={!!addRuleFor}
          categoryName={addRuleFor?.name || ''}
          onClose={() => setAddRuleFor(null)}
          onSave={(pattern, matchType) => {
            if (!addRuleFor) return;
            addRule.mutate(
              { category_id: addRuleFor.id, pattern, match_type: matchType, match_field: 'description' },
              { onSuccess: () => setAddRuleFor(null) }
            );
          }}
          isSaving={addRule.isPending}
        />
      </CardContent>
    </Card>
  );
}
