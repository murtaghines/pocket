import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Search, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';
import { useCategorizationRules } from '@/hooks/useCategorizationRules';
import { useCustomCategories, type CustomCategoryRule } from '@/hooks/useCustomCategories';
import { CategoryRulesList } from './CategoryRulesList';
import { AddRuleDialog } from './AddRuleDialog';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { useToast } from '@/hooks/use-toast';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Rule = Database["public"]["Tables"]["categorization_rules"]["Row"];

type TabKey = 'income' | 'expense' | 'transfer';

interface RuleDialogState {
  categoryId: string;
  categoryName: string;
  editingRule?: { id: string; pattern: string; matchType: string } | null;
}

export function CategoriesEditor() {
  const { t } = useTranslation('settings');
  const { toast } = useToast();
  const { incomeCategories, expenseCategories, transferCategories, isLoading: catsLoading } = useCategories('CASHFLOW');
  const { rules, isLoading: rulesLoading, addRule, updateRule, deleteRule, getRulesForCategory } = useCategorizationRules();
  const { customCategories, isSaving, addCustomCategory, removeRule: removeCustomRule, rules: allCustomRules, getVisualOverride, setVisualOverride } = useCustomCategories();
  const { getCategoryLabel } = useCategoryTranslations();

  const [dialogState, setDialogState] = useState<RuleDialogState | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('expense');
  const [search, setSearch] = useState('');

  const isLoading = catsLoading || rulesLoading;

  const incomeCustom = useMemo(() => customCategories.filter(c => c.movement === 'INCOME'), [customCategories]);
  const expenseCustom = useMemo(() => customCategories.filter(c => c.movement === 'EXPENSE'), [customCategories]);

  const totalRules = rules.length + customCategories.reduce((acc, c) => acc + c.keywords.length, 0);

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

  const filterByName = <T extends { name: string; slug?: string | null }>(arr: T[]) => {
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter(c => {
      const label = c.slug ? getCategoryLabel(c.slug).toLowerCase() : c.name.toLowerCase();
      return label.includes(q) || c.name.toLowerCase().includes(q);
    });
  };

  const filterCustom = (arr: CustomCategoryRule[]) => {
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter(c => c.name.toLowerCase().includes(q) || c.keywords.some(k => k.toLowerCase().includes(q)));
  };

  const tabs: { key: TabKey; label: string; icon: typeof TrendingUp; count: number; accent: string }[] = [
    {
      key: 'expense',
      label: 'Expenses',
      icon: TrendingDown,
      count: expenseCategories.length + expenseCustom.length,
      accent: 'text-orange-600 dark:text-orange-400',
    },
    {
      key: 'income',
      label: 'Income',
      icon: TrendingUp,
      count: incomeCategories.length + incomeCustom.length,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'transfer',
      label: 'Transfers',
      icon: ArrowRightLeft,
      count: transferCategories.length,
      accent: 'text-sky-600 dark:text-sky-400',
    },
  ];

  const activeData = (() => {
    if (activeTab === 'income') return { cats: filterByName(incomeCategories), custom: filterCustom(incomeCustom) };
    if (activeTab === 'expense') return { cats: filterByName(expenseCategories), custom: filterCustom(expenseCustom) };
    return { cats: filterByName(transferCategories), custom: [] as CustomCategoryRule[] };
  })();

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories or keywords…"
            className="pl-9 h-10 text-sm bg-card"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{totalRules}</span> rules total
          </span>
          <Button
            size="default"
            className="h-10 gap-1.5"
            onClick={() => setShowCreateCategory(true)}
          >
            <Plus className="w-4 h-4" />
            New category
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4", active ? tab.accent : '')} />
              <span>{tab.label}</span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded font-semibold tabular-nums",
                active ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"
              )}>
                {tab.count}
              </span>
              {active && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Helper hint */}
      <p className="text-sm text-muted-foreground">
        Click any category to view, add or edit its rules. Rules teach Pocket how to classify transactions
        from your statements automatically.
      </p>

      {/* List */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Loading categories…
        </div>
      ) : activeData.cats.length === 0 && activeData.custom.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            {search ? 'No categories match your search.' : 'No categories in this section yet.'}
          </p>
          {!search && (
            <Button variant="outline" size="sm" onClick={() => setShowCreateCategory(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Create category
            </Button>
          )}
        </div>
      ) : (
        <CategoryRulesList
          categories={activeData.cats}
          getRulesForCategory={getRulesForCategory}
          onAddRule={handleAddRule}
          onEditRule={handleEditRule}
          onDeleteRule={(id) => deleteRule.mutate(id)}
          customCategories={activeData.custom}
          onDeleteCustomCategory={handleDeleteCustomCategory}
          getVisualOverride={getVisualOverride}
          onSetVisualOverride={setVisualOverride}
        />
      )}

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
