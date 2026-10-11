import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Plus, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

import { useCategories } from '@/hooks/useCategories';
import { useCategorizationRules, type Rule } from '@/hooks/useCategorizationRules';
import { useCustomCategories, type CustomCategoryRule } from '@/hooks/useCustomCategories';
import { CategoryRulesList } from './CategoryRulesList';
import { AddRuleDialog } from './AddRuleDialog';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { SuggestedRulesSection } from './SuggestedRulesSection';
import { ReviewQueueSection } from './ReviewQueueSection';
import { useCategorizationCoverage } from '@/hooks/useCategorizationCoverage';
import { useToast } from '@/hooks/use-toast';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { cn } from '@/lib/utils';

type TabKey = 'income' | 'expense' | 'transfer';

interface RuleDialogState {
  category: {
    id: string;
    name: string;
    movement?: string | null;
    slug?: string | null;
    icon?: string | null;
    color?: string | null;
  };
  editingRule?: { id: string; pattern: string; matchType: string } | null;
}

export function CategoriesEditor() {
  const { t } = useTranslation('settings');
  const { toast } = useToast();
  const { incomeCategories, expenseCategories, transferCategories, isLoading: catsLoading } = useCategories('CASHFLOW');
  const { rules, isLoading: rulesLoading, addRule, updateRule, deleteRule, getRulesForCategory } = useCategorizationRules();
  const { customCategories, isSaving, addCustomCategory, updateCustomCategory, removeRule: removeCustomRule, rules: allCustomRules, getVisualOverride, setVisualOverride } = useCustomCategories();
  const { getCategoryLabel } = useCategoryTranslations();
  const { data: coverage } = useCategorizationCoverage();

  const [dialogState, setDialogState] = useState<RuleDialogState | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCustomCategory, setEditingCustomCategory] = useState<CustomCategoryRule | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('expense');


  const isLoading = catsLoading || rulesLoading;

  const incomeCustom = useMemo(() => customCategories.filter(c => c.movement === 'INCOME'), [customCategories]);
  const expenseCustom = useMemo(() => customCategories.filter(c => c.movement === 'EXPENSE'), [customCategories]);
  const transferCustom = useMemo(() => customCategories.filter(c => c.movement === 'TRANSFER'), [customCategories]);

  const totalRules = rules.length + customCategories.reduce((acc, c) => acc + c.keywords.length, 0);

  const toDialogCat = (cat: any) => ({
    id: cat.id,
    name: getCategoryLabel(cat.slug) || cat.name,
    movement: cat.movement,
    slug: cat.slug,
    icon: cat.icon,
    color: cat.color,
  });

  const handleAddRule = (cat: any) => {
    setDialogState({ category: toDialogCat(cat) });
  };

  const handleEditRule = (rule: Rule, cat: any) => {
    setDialogState({
      category: toDialogCat(cat),
      editingRule: { id: rule.id, pattern: rule.pattern, matchType: rule.match_type },
    });
  };

  const handleSave = (pattern: string, matchType: string, matchingTransactionIds?: string[], accountId?: string | null) => {
    if (!dialogState) return;
    const editing = dialogState.editingRule;
    if (editing) {
      updateRule.mutate(
        { ruleId: editing.id, pattern, match_type: matchType, account_id: accountId },
        { onSuccess: () => setDialogState(null) }
      );
    } else {
      addRule.mutate(
        { category_id: dialogState.category.id, pattern, match_type: matchType, match_field: 'description_norm', account_id: accountId, matchingTransactionIds },
        {
          onSuccess: () => {
            if (matchingTransactionIds && matchingTransactionIds.length > 0) {
              toast({ title: t('categories.pastTransactionsUpdated', { count: matchingTransactionIds.length }) });
            }
            setDialogState(null);
          },
        }
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
      if (editingCustomCategory) {
        await updateCustomCategory(editingCustomCategory.slug, data);
        toast({ title: t('categories.ruleSaved') });
        setEditingCustomCategory(null);
      } else {
        await addCustomCategory(data);
        toast({ title: t('categories.customCategorySaved') });
      }
      setShowCreateCategory(false);
    } catch {
      toast({ title: t('categories.errorSaving', 'Error saving'), variant: 'destructive' });
    }
  };

  const handleEditCustomCategory = (cat: CustomCategoryRule) => {
    setEditingCustomCategory(cat);
    setShowCreateCategory(true);
  };

  const tabs: { key: TabKey; label: string; icon: typeof TrendingUp; count: number }[] = [
    {
      key: 'expense',
      label: t('categories.expenses'),
      icon: TrendingDown,
      count: expenseCategories.length + expenseCustom.length,
    },
    {
      key: 'income',
      label: t('categories.income'),
      icon: TrendingUp,
      count: incomeCategories.length + incomeCustom.length,
    },
    {
      key: 'transfer',
      label: t('categories.transfers'),
      icon: ArrowRightLeft,
      count: transferCategories.length + transferCustom.length,
    },
  ];

  const activeData = (() => {
    if (activeTab === 'income') return { cats: incomeCategories, custom: incomeCustom };
    if (activeTab === 'expense') return { cats: expenseCategories, custom: expenseCustom };
    return { cats: transferCategories, custom: transferCustom };
  })();


  return (
    <div className="flex flex-col min-h-screen">
      {/* ============= Header: title (left) + actions (right) — mirrors Bank statements ============= */}
      <div className="flex items-center justify-between gap-3 px-6 md:px-10 py-5 md:py-6 border-b border-border bg-card">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
            {t('categories.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {t('categories.description')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setShowCreateCategory(true)}
            className="gap-2 h-9 px-5 font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('categories.newCategory')}
          </Button>
        </div>
      </div>

      {/* ============= Tab strip (Airtable style — same band as Bank statements) ============= */}
      <div className="relative">
        <div className="flex items-stretch border-b border-border bg-primary/5">
          <div className="flex-1 flex items-stretch overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "group relative flex items-center gap-2 px-5 py-2.5 text-sm whitespace-nowrap transition-all border-r border-border/40",
                    active
                      ? "bg-card text-foreground font-semibold -mb-px border-b-card z-10"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/10",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
                      active ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary/70",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right cluster — search + total rules */}
          <div className="hidden md:flex items-center gap-3 px-3 border-l border-border/40">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t('categories.rulesTotal', { count: totalRules })}
            </span>
          </div>
        </div>
      </div>

      {/* ============= Workspace ============= */}
      <div className="flex-1 px-6 md:px-10 py-6 md:py-8 space-y-4">

        {!isLoading && coverage && coverage.total > 0 && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{t('categories.categorizationCoverage')}</span>
                <span className="text-sm font-semibold text-foreground">{coverage.percent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    coverage.percent >= 90 ? "bg-success" : coverage.percent >= 70 ? "bg-warning" : "bg-destructive",
                  )}
                  style={{ width: `${coverage.percent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">
                {t('categories.coverageDetail', { highConfidence: coverage.highConfidence, total: coverage.total })}
              </span>
            </div>
          </div>
        )}
        {!isLoading && (
          <ReviewQueueSection
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            transferCategories={transferCategories}
          />
        )}
        {!isLoading && (
          <SuggestedRulesSection
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            transferCategories={transferCategories}
          />
        )}

        {isLoading ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            {t('categories.loadingCategories')}
          </div>
        ) : activeData.cats.length === 0 && activeData.custom.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {t('categories.noCategoriesYet')}
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowCreateCategory(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {t('categories.createCategory')}
            </Button>
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
            onEditCustomCategory={handleEditCustomCategory}
            getVisualOverride={getVisualOverride}
            onSetVisualOverride={setVisualOverride}
          />
        )}
      </div>


      <AddRuleDialog
        open={!!dialogState}
        category={dialogState?.category ?? null}
        editingRule={dialogState?.editingRule}
        onClose={() => setDialogState(null)}
        onSave={handleSave}
        isSaving={addRule.isPending || updateRule.isPending}
      />

      <CreateCategoryDialog
        open={showCreateCategory}
        onClose={() => { setShowCreateCategory(false); setEditingCustomCategory(null); }}
        onSave={handleCreateCategory}
        isSaving={isSaving}
        editingCategory={editingCustomCategory}
      />
    </div>
  );
}
