import { useMemo, useState, useCallback } from 'react';
import { Plus, Lock, Trash2, Info, Sparkles, Calendar, Code2, ChevronDown, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useCategories } from '@/hooks/useCategories';
import { useCategorizationRules, type Rule, buildDbRuleFields } from '@/hooks/useCategorizationRules';
import { useCustomCategories, type CustomCategoryRule } from '@/hooks/useCustomCategories';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { useSuggestions, type Suggestion } from '@/hooks/useSuggestions';
import { useCategoryTransactions } from '@/hooks/useCategoryTransactions';
import { useLocalization } from '@/hooks/useLocalization';
import { useRulePreview } from '@/hooks/useRulePreview';
import { useToast } from '@/hooks/use-toast';
import { useAccounts } from '@/hooks/useAccounts';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { AddRuleDialog } from './AddRuleDialog';
import { RetroactiveApplyOptions } from './RetroactiveApplyOptions';
import { filterByScope, type RetroScope } from '@/hooks/useRetroactiveApply';
import { CategoryEditorPopover } from './CategoryEditorPopover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccountScopeSelect } from '@/components/imports/AccountScopeSelect';
import { getLucideIcon } from '@/lib/lucideIcon';
import { cn } from '@/lib/utils';
import { getAccountDisplayName } from '@/lib/accountColors';
import { categoryExamples } from '@/lib/categoryExamples';
import type { Database } from '@/integrations/supabase/types';
import type { MatchType } from '@/lib/userRules';

type Category = Database['public']['Tables']['categories']['Row'];
type TabKey = 'expense' | 'income' | 'transfer';

interface SelectedCategory {
  id: string;
  name: string;
  slug: string;
  movement: string;
  isCustom: boolean;
  customIndex?: number;
}

const MATCH_TYPE_OPTIONS = ['CONTAINS', 'STARTS_WITH', 'EXACT', 'REGEX'] as const;

const MATCH_TYPE_LABEL: Record<string, string> = {
  SMART: 'SMART',
  CONTAINS: 'CONTAINS',
  STARTS_WITH: 'STARTS WITH',
  ENDS_WITH: 'ENDS WITH',
  EXACT: 'EXACT',
  REGEX: 'REGEX',
};

const MATCH_TYPE_INFO = [
  { key: 'SMART', label: 'SMART', helpKey: 'matchHelp_SMART' },
  { key: 'CONTAINS', label: 'CONTAINS', helpKey: 'matchHelp_CONTAINS' },
  { key: 'STARTS_WITH', label: 'STARTS WITH', helpKey: 'matchHelp_STARTS_WITH' },
  { key: 'EXACT', label: 'EXACT', helpKey: 'matchHelp_EXACT' },
  { key: 'REGEX', label: 'REGEX', helpKey: 'matchHelp_REGEX' },
] as const;

function RenderIcon({ name, size = 18 }: { name: string; size?: number }) {
  const I = getLucideIcon(name);
  return I ? <I size={size} strokeWidth={2} /> : null;
}

export function CategoriesEditor() {
  const { t } = useTranslation('settings');
  const { toast } = useToast();
  const { formatCurrency, formatDateShort } = useLocalization();
  const { getCategoryLabel, getCategoryIcon, getCategoryColor, getCategoryHsl } = useCategoryTranslations();
  const { incomeCategories, expenseCategories, transferCategories, isLoading: catsLoading } = useCategories('CASHFLOW');
  const { rules, isLoading: rulesLoading, addRule, updateRule, deleteRule, getRulesForCategory } = useCategorizationRules();
  const { customCategories, isSaving, addCustomCategory, updateCustomCategory, removeRule: removeCustomRule, rules: allCustomRules, getVisualOverride, setVisualOverride } = useCustomCategories();
  const { data: suggestions = [] } = useSuggestions();
  const { accounts } = useAccounts();

  const [activeTab, setActiveTab] = useState<TabKey>('expense');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCustomCategory, setEditingCustomCategory] = useState<CustomCategoryRule | null>(null);
  const [showEditorPopover, setShowEditorPopover] = useState(false);

  // Inline add rule state
  const [newPattern, setNewPattern] = useState('');
  const [newMatchType, setNewMatchType] = useState<string>('CONTAINS');
  const [showMatchTypeDropdown, setShowMatchTypeDropdown] = useState(false);
  const [showCreateRulePopup, setShowCreateRulePopup] = useState(false);
  const [retroScope, setRetroScope] = useState<RetroScope>('all');
  const [customSince, setCustomSince] = useState('');
  const [newRuleAccountScope, setNewRuleAccountScope] = useState<string[] | null>(null);
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  // Edit rule via dialog
  const [editDialogState, setEditDialogState] = useState<{
    category: { id: string; name: string; movement?: string | null; slug?: string | null; icon?: string | null; color?: string | null };
    editingRule: { id: string; pattern: string; matchType: string };
  } | null>(null);

  const isLoading = catsLoading || rulesLoading;

  const accountNameById = useMemo(() => new Map(accounts.map(a => [a.id, getAccountDisplayName(a)])), [accounts]);
  const activeAccounts = useMemo(() => accounts.filter(a => !a.archived), [accounts]);

  const incomeCustom = useMemo(() => customCategories.filter(c => c.movement === 'INCOME'), [customCategories]);
  const expenseCustom = useMemo(() => customCategories.filter(c => c.movement === 'EXPENSE'), [customCategories]);
  const transferCustom = useMemo(() => customCategories.filter(c => c.movement === 'TRANSFER'), [customCategories]);

  const activeData = useMemo(() => {
    if (activeTab === 'income') return { cats: incomeCategories, custom: incomeCustom, movement: 'INCOME' };
    if (activeTab === 'transfer') return { cats: transferCategories, custom: transferCustom, movement: 'TRANSFER' };
    return { cats: expenseCategories, custom: expenseCustom, movement: 'EXPENSE' };
  }, [activeTab, incomeCategories, expenseCategories, transferCategories, incomeCustom, expenseCustom, transferCustom]);

  // Build the merged category list for the sidebar
  const categoryList = useMemo(() => {
    const items: SelectedCategory[] = [];
    for (const cat of activeData.cats) {
      const slug = cat.slug || cat.name;
      const override = getVisualOverride(slug);
      items.push({
        id: cat.id,
        name: override?.name || getCategoryLabel(slug),
        slug,
        movement: (cat.movement_type as string) || activeData.movement,
        isCustom: false,
      });
    }
    for (let i = 0; i < activeData.custom.length; i++) {
      const cat = activeData.custom[i];
      items.push({
        id: `custom-${cat.slug}-${i}`,
        name: cat.name,
        slug: cat.slug,
        movement: cat.movement,
        isCustom: true,
        customIndex: allCustomRules.indexOf(cat),
      });
    }
    return items;
  }, [activeData, getCategoryLabel, allCustomRules]);

  // Auto-select first category when tab changes or list loads
  const effectiveSelected = useMemo(() => {
    if (selectedId && categoryList.find(c => c.id === selectedId)) return selectedId;
    return categoryList[0]?.id || null;
  }, [selectedId, categoryList]);

  const selected = useMemo(() => categoryList.find(c => c.id === effectiveSelected) || null, [categoryList, effectiveSelected]);

  // Raw HSL values for the selected category (e.g. "210 80% 55%")
  const selectedHsl = useMemo(() => {
    if (!selected) return '216 100% 55%';
    if (selected.isCustom) {
      const custom = activeData.custom.find(c => c.slug === selected.slug);
      return custom?.color || '216 100% 55%';
    }
    const override = getVisualOverride(selected.slug);
    if (override?.color) return override.color;
    return getCategoryHsl(selected.slug);
  }, [selected, activeData.custom, getVisualOverride, getCategoryHsl]);

  const selectedColor = `hsl(${selectedHsl})`;

  const selectedIcon = useMemo(() => {
    if (!selected) return 'circle';
    if (selected.isCustom) {
      const custom = activeData.custom.find(c => c.slug === selected.slug);
      return custom?.icon || 'tag';
    }
    const override = getVisualOverride(selected.slug);
    return override?.icon || getCategoryIcon(selected.slug);
  }, [selected, activeData.custom, getVisualOverride, getCategoryIcon]);

  // Rules for the selected category
  const selectedRules = useMemo(() => {
    if (!selected) return [];
    if (selected.isCustom) {
      const custom = activeData.custom.find(c => c.slug === selected.slug);
      return (custom?.keywords || []).map((kw, i) => ({
        id: `kw-${i}`,
        pattern: kw,
        match_type: 'CONTAINS',
        isKeyword: true,
      }));
    }
    return getRulesForCategory(selected.id).map(r => ({
      id: r.id,
      pattern: r.pattern,
      match_type: r.match_type,
      applied_count: r.applied_count,
      last_applied_at: r.last_applied_at,
      account_id: r.account_id,
      isKeyword: false,
    }));
  }, [selected, activeData.custom, getRulesForCategory]);

  // Suggestions for the selected category's movement type
  const categorySuggestions = useMemo(() => {
    if (!selected) return [];
    return suggestions.filter(s => s.movement === selected.movement);
  }, [selected, suggestions]);

  // Recent transactions
  const { data: recentTx = [] } = useCategoryTransactions(
    selected && !selected.isCustom ? selected.id : null
  );

  // Rule preview for inline add
  const { dbType: previewDbType, pattern: previewPattern, tokens: previewTokens } = useMemo(
    () => buildDbRuleFields(newPattern.trim(), newMatchType, selected?.movement || 'EXPENSE', selected?.slug || ''),
    [newPattern, newMatchType, selected?.movement, selected?.slug]
  );
  const { matched: previewMatched } = useRulePreview({
    matchType: previewDbType as MatchType,
    pattern: previewPattern,
    tokens: previewTokens,
    movement: selected?.movement || 'EXPENSE',
    accountIds: null,
    enabled: !!selected && newPattern.trim().length > 0 && !showCreateRulePopup,
  });

  const handleSelectTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setSelectedId(null);
    setNewPattern('');
    setShowCreateRulePopup(false);
  }, []);

  const handleAddRuleInline = useCallback(() => {
    if (!selected || !newPattern.trim()) return;
    if (previewMatched.length > 0 || activeAccounts.length > 1) {
      setShowCreateRulePopup(true);
      return;
    }
    addRule.mutate(
      {
        category_id: selected.id,
        pattern: newPattern.trim().toLowerCase(),
        match_type: newMatchType,
      },
      {
        onSuccess: () => {
          toast({ title: t('categories.ruleSaved') });
          setNewPattern('');
        },
      },
    );
  }, [selected, newPattern, newMatchType, previewMatched, activeAccounts, addRule, toast, t]);

  const handleCreateRuleFromPopup = useCallback(() => {
    if (!selected || !newPattern.trim()) return;
    const filteredIds = previewMatched.length > 0
      ? filterByScope(previewMatched, retroScope, customSince ? customSince + '-01' : undefined)
      : undefined;
    const ruleAccountId = newRuleAccountScope && newRuleAccountScope.length === 1 ? newRuleAccountScope[0] : null;

    addRule.mutate(
      {
        category_id: selected.id,
        pattern: newPattern.trim().toLowerCase(),
        match_type: newMatchType,
        matchingTransactionIds: filteredIds,
        account_id: ruleAccountId,
      },
      {
        onSuccess: () => {
          if (filteredIds && filteredIds.length > 0) {
            toast({ title: t('categories.pastTransactionsUpdated', { count: filteredIds.length }) });
          } else {
            toast({ title: t('categories.ruleSaved') });
          }
          setNewPattern('');
          setShowCreateRulePopup(false);
          setRetroScope('all');
          setCustomSince('');
          setNewRuleAccountScope(null);
        },
      },
    );
  }, [selected, newPattern, newMatchType, previewMatched, retroScope, customSince, newRuleAccountScope, addRule, toast, t]);

  const handleDeleteRule = useCallback((ruleId: string) => {
    deleteRule.mutate(ruleId, {
      onSuccess: () => toast({ title: t('categories.ruleDeleted') }),
    });
  }, [deleteRule, toast, t]);

  const handleEditRule = useCallback((rule: Rule) => {
    if (!selected) return;
    const custom = selected.isCustom ? activeData.custom.find(c => c.slug === selected.slug) : null;
    setEditDialogState({
      category: {
        id: selected.id,
        name: selected.name,
        movement: selected.movement,
        slug: selected.slug,
        icon: selectedIcon,
        color: selectedColor,
      },
      editingRule: { id: rule.id, pattern: rule.pattern, matchType: rule.match_type },
    });
  }, [selected, selectedIcon, selectedColor, activeData.custom]);

  const handleEditDialogSave = useCallback((pattern: string, matchType: string, matchingTransactionIds?: string[], accountId?: string | null) => {
    if (!editDialogState) return;
    updateRule.mutate(
      { ruleId: editDialogState.editingRule.id, pattern, match_type: matchType, account_id: accountId },
      { onSuccess: () => { setEditDialogState(null); toast({ title: t('categories.ruleSaved') }); } },
    );
  }, [editDialogState, updateRule, toast, t]);

  const handleDeleteCustomCategory = useCallback(async () => {
    if (!selected?.isCustom || selected.customIndex == null) return;
    try {
      await removeCustomRule(selected.customIndex);
      toast({ title: t('categories.categoryDeleted') });
      setSelectedId(null);
    } catch {
      toast({ title: t('categories.errorSaving', 'Error'), variant: 'destructive' });
    }
  }, [selected, removeCustomRule, toast, t]);

  const handleCreateCategory = useCallback(async (data: Omit<CustomCategoryRule, 'type'>) => {
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
      toast({ title: t('categories.errorSaving', 'Error'), variant: 'destructive' });
    }
  }, [editingCustomCategory, updateCustomCategory, addCustomCategory, toast, t]);

  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    if (!selected) return;
    addRule.mutate(
      {
        category_id: selected.id,
        pattern: suggestion.pattern.toLowerCase(),
        match_type: 'SMART',
        matchingTransactionIds: suggestion.transactionIds,
      },
      {
        onSuccess: () => {
          toast({ title: t('categories.ruleCreated', { count: suggestion.transactionIds.length }) });
        },
      },
    );
  }, [selected, addRule, toast, t]);

  // Raw HSL for sidebar items (for alpha computation)
  const getItemHsl = useCallback((item: SelectedCategory): string => {
    if (item.isCustom) {
      const custom = activeData.custom.find(c => c.slug === item.slug);
      return custom?.color || '220 10% 55%';
    }
    const override = getVisualOverride(item.slug);
    if (override?.color) return override.color;
    return getCategoryHsl(item.slug);
  }, [activeData.custom, getVisualOverride, getCategoryHsl]);

  const getItemColor = useCallback((item: SelectedCategory) => {
    return `hsl(${getItemHsl(item)})`;
  }, [getItemHsl]);

  const getItemIcon = useCallback((item: SelectedCategory) => {
    if (item.isCustom) {
      const custom = activeData.custom.find(c => c.slug === item.slug);
      return custom?.icon || 'tag';
    }
    const override = getVisualOverride(item.slug);
    return override?.icon || getCategoryIcon(item.slug);
  }, [activeData.custom, getVisualOverride, getCategoryIcon]);

  const getRuleCount = useCallback((item: SelectedCategory) => {
    if (item.isCustom) {
      const custom = activeData.custom.find(c => c.slug === item.slug);
      return custom?.keywords.length || 0;
    }
    return getRulesForCategory(item.id).length;
  }, [activeData.custom, getRulesForCategory]);

  const tabCounts = useMemo(() => ({
    expense: expenseCategories.length + expenseCustom.length,
    income: incomeCategories.length + incomeCustom.length,
    transfer: transferCategories.length + transferCustom.length,
  }), [expenseCategories, incomeCategories, transferCategories, expenseCustom, incomeCustom, transferCustom]);

  const sectionLabel = activeTab === 'income'
    ? t('categories.sectionIncome')
    : activeTab === 'transfer'
      ? t('categories.sectionTransfers')
      : t('categories.sectionExpenses');

  const addRulePlaceholder = activeTab === 'income'
    ? t('categories.addRulePlaceholderIncome')
    : activeTab === 'transfer'
      ? t('categories.addRulePlaceholderTransfer')
      : t('categories.addRulePlaceholderExpense');

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        {t('categories.loadingCategories')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F7F8FC' }}>
      {/* ====== Blue banner ====== */}
      <div className="shrink-0" style={{ background: 'hsl(var(--primary))', padding: '22px 34px 62px' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[19px] font-semibold text-white leading-none tracking-[-0.01em]">
              {t('categories.title')}
            </h1>
            <p
              className="tabular-nums"
              style={{ font: '500 12.5px Inter, sans-serif', color: 'rgba(255,255,255,0.8)', marginTop: 6 }}
            >
              {t('categories.bannerSubtitle', { ruleCount: rules.length, catCount: tabCounts.expense + tabCounts.income + tabCounts.transfer })}
            </p>
          </div>
          {/* Segmented tab control */}
          <div
            className="flex bg-white/[0.16] rounded-[12px] p-[4px] gap-[2px]"
            role="tablist"
          >
            {(['expense', 'income', 'transfer'] as TabKey[]).map((tab) => {
              const active = tab === activeTab;
              const label = tab === 'income' ? t('categories.income') : tab === 'transfer' ? t('categories.transfers') : t('categories.expenses');
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectTab(tab)}
                  className={cn(
                    'flex items-center gap-1.5 px-[13px] h-[28px] rounded-[9px] text-[13px] transition-colors',
                    active
                      ? 'bg-white text-primary font-semibold'
                      : 'text-white/85 font-medium hover:bg-white/10',
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      'text-[11px] tabular-nums',
                      active ? 'text-primary/70' : 'text-white/60',
                    )}
                  >
                    {tabCounts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====== Content wrapper (overlaps banner by 58px) ====== */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{ padding: '0 34px 32px', marginTop: -46 }}
      >
        <div className="grid h-full gap-4" style={{ gridTemplateColumns: '336px minmax(0,1fr)' }}>
          {/* ====== LEFT COLUMN — Sidebar ====== */}
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            {/* New Category card */}
            <button
              type="button"
              onClick={() => setShowCreateCategory(true)}
              className="shrink-0 flex items-center gap-3 bg-white rounded-[14px] transition-colors hover:bg-[#F7F8FC]"
              style={{
                padding: '12px 16px',
                boxShadow: '0 10px 26px -14px rgba(16,24,40,.30), 0 2px 4px rgba(16,24,40,.05)',
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: '#EFF4FF', color: '#1B76FF',
                }}
              >
                <Plus size={18} strokeWidth={2} />
              </div>
              <div className="text-left">
                <div className="text-[14px] font-semibold" style={{ color: '#1B76FF' }}>
                  {t('categories.newCategory')}
                </div>
                <div className="text-[12px]" style={{ color: '#9AA1AC' }}>
                  {t('categories.newCategorySubtitle')}
                </div>
              </div>
            </button>

            {/* Category list card */}
            <div
              className="flex-1 min-h-0 flex flex-col bg-white rounded-[14px] overflow-hidden"
              style={{
                padding: '14px 10px 10px',
                boxShadow: '0 10px 26px -14px rgba(16,24,40,.30), 0 2px 4px rgba(16,24,40,.05)',
              }}
            >
              {/* Section label */}
              <div className="flex items-center gap-2 px-2.5 pb-2">
                <span
                  className="text-[10.5px] font-bold tracking-[.09em]"
                  style={{ color: '#B4BAC3' }}
                >
                  {sectionLabel}
                </span>
                <span
                  className="text-[10.5px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
                  style={{ background: '#F1F3F8', color: '#9AA1AC' }}
                >
                  {categoryList.length}
                </span>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {categoryList.map((item) => {
                  const color = getItemColor(item);
                  const icon = getItemIcon(item);
                  const ruleCount = getRuleCount(item);
                  const isActive = item.id === effectiveSelected;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'w-full flex items-center gap-[11px] rounded-[10px] transition-colors text-left',
                        isActive ? '' : 'hover:bg-[#F7F8FC]',
                      )}
                      style={{
                        padding: '9px 10px',
                        background: isActive ? 'rgba(27,118,255,.08)' : undefined,
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="shrink-0 flex items-center justify-center rounded-[10px]"
                        style={{
                          width: 30, height: 30,
                          background: `hsl(${getItemHsl(item)} / 0.15)`,
                          color,
                        }}
                      >
                        <RenderIcon name={icon} size={16} />
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn('text-[13.5px] truncate', isActive ? 'font-semibold' : 'font-medium')}
                          style={{ color: isActive ? '#1B76FF' : '#0C0D0E' }}
                        >
                          {item.name}
                        </div>
                      </div>

                      {/* Rule count pill */}
                      {ruleCount > 0 ? (
                        <span
                          className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full tabular-nums"
                          style={{
                            background: `hsl(${getItemHsl(item)} / 0.12)`,
                            color,
                          }}
                        >
                          {t('categories.rulesLabel', { count: ruleCount })}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] px-2 py-0.5" style={{ color: '#B4BAC3' }}>
                          {t('categories.noRulesShort')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer disclaimer */}
              <div className="shrink-0 pt-2 mt-2 border-t" style={{ borderColor: '#F3F5F9' }}>
                <div className="flex items-start gap-2 px-2">
                  <Info size={13} className="shrink-0 mt-0.5" style={{ color: '#9AA1AC' }} />
                  <span className="text-[11px] leading-snug" style={{ color: '#9AA1AC' }}>
                    {t('categories.defaultDisclaimer')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ====== RIGHT COLUMN — Detail panel ====== */}
          <div
            className="h-full overflow-hidden flex flex-col bg-white rounded-[14px]"
            style={{
              boxShadow: '0 10px 26px -14px rgba(16,24,40,.30), 0 2px 4px rgba(16,24,40,.05)',
            }}
          >
            {selected ? (
              <>
                {/* Hero */}
                <div
                  className="shrink-0 relative"
                  style={{
                    padding: '16px 22px 14px',
                    background: `linear-gradient(180deg, hsl(${selectedHsl} / 0.055) 0%, #fff 70%)`,
                    borderBottom: '1px solid #F3F5F9',
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Large icon badge */}
                    <div className="relative group/icon">
                      <button
                        type="button"
                        onClick={() => setShowEditorPopover(!showEditorPopover)}
                        aria-expanded={showEditorPopover}
                        className="flex items-center justify-center rounded-[16px] cursor-pointer transition-transform"
                        style={{
                          width: 52, height: 52,
                          background: `hsl(${selectedHsl} / 0.15)`,
                          color: selectedColor,
                        }}
                      >
                        <RenderIcon name={selectedIcon} size={26} />
                      </button>
                      {/* Pencil pin on hover */}
                      <div
                        className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center opacity-0 group-hover/icon:opacity-100 translate-y-0.5 group-hover/icon:translate-y-0 transition-all"
                        style={{
                          border: '2px solid #F7F8FC',
                          color: '#5A6069',
                          boxShadow: '0 2px 4px rgba(16,24,40,.14)',
                          transitionDuration: '160ms',
                        }}
                      >
                        <Pencil size={11} />
                      </div>
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[20px] font-bold text-foreground truncate">
                        {selected.name}
                      </h2>
                      <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                        {/* Movement pill */}
                        <span
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                          style={{
                            background: `hsl(${selectedHsl} / 0.12)`,
                            color: selectedColor,
                          }}
                        >
                          {selected.movement === 'INCOME' ? t('categories.income') : selected.movement === 'TRANSFER' ? t('categories.transfers') : t('categories.expenses')}
                        </span>
                        {recentTx.length > 0 && (
                          <span className="text-[12px] font-medium tabular-nums" style={{ color: '#5A6069' }}>
                            {recentTx.length} tx · {formatCurrency(recentTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Editor popover */}
                  {showEditorPopover && (
                    <CategoryEditorPopover
                      slug={selected.slug}
                      isCustom={selected.isCustom}
                      currentColor={(() => {
                        if (selected.isCustom) {
                          const custom = activeData.custom.find(c => c.slug === selected.slug);
                          return custom?.color || '210 15% 50%';
                        }
                        const override = getVisualOverride(selected.slug);
                        return override?.color || '203 60% 51%';
                      })()}
                      currentIcon={selectedIcon}
                      currentName={selected.name}
                      onSave={async (color, icon, name) => {
                        await setVisualOverride(selected.slug, color, icon, name);
                        setShowEditorPopover(false);
                      }}
                      onClose={() => setShowEditorPopover(false)}
                    />
                  )}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {/* Rules section */}
                  <div style={{ padding: '16px 22px 14px' }}>
                    {/* Rules header */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-bold" style={{ color: '#0C0D0E' }}>
                        {t('categories.categorizationRules')}
                      </h3>
                      <div className="flex-1" />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowInfoPopover(!showInfoPopover)}
                          className="flex items-center justify-center rounded-full transition-colors hover:bg-[#EFF4FF]"
                          style={{ width: 22, height: 22, background: showInfoPopover ? '#EFF4FF' : '#F1F3F8', color: showInfoPopover ? '#1B76FF' : '#9AA1AC' }}
                        >
                          <Info size={12} />
                        </button>
                        {showInfoPopover && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setShowInfoPopover(false)} />
                            <div
                              className="absolute right-0 top-full mt-2 z-30 bg-card rounded-lg"
                              style={{
                                boxShadow: '0 0 0 1px rgba(15,15,15,0.05), 0 3px 6px rgba(15,15,15,0.1), 0 9px 24px rgba(15,15,15,0.2)',
                                width: 280, padding: '14px 16px',
                              }}
                            >
                              <span className="text-[10px] font-semibold uppercase tracking-[.07em]" style={{ color: '#9AA1AC' }}>
                                {t('categories.matchInfoTitle')}
                              </span>
                              <div className="mt-2.5 space-y-3">
                                {MATCH_TYPE_INFO.map((mt) => (
                                  <div key={mt.key}>
                                    <span
                                      className="text-[10.5px] font-bold tracking-[.04em] px-2 py-0.5 rounded-[5px]"
                                      style={{ background: mt.key === 'SMART' ? 'rgba(27,118,255,.1)' : '#F1F3F8', color: mt.key === 'SMART' ? '#1B76FF' : '#0C0D0E' }}
                                    >
                                      {mt.label}
                                    </span>
                                    <p className="text-[12px] leading-snug mt-1" style={{ color: '#5A6069' }}>
                                      {t(`categories.${mt.helpKey}`)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <p
                      className="text-[12.5px] leading-relaxed mb-4"
                      style={{ color: '#9AA1AC' }}
                      dangerouslySetInnerHTML={{
                        __html: t('categories.rulesSubtitle', { name: selected.name })
                          .replace(
                            `<strong>${selected.name}</strong>`,
                            `<strong style="font-weight:600;color:${selectedColor}">${selected.name}</strong>`,
                          ),
                      }}
                    />

                    {/* Rule rows */}
                    {selectedRules.length === 0 && (
                      <div
                        className="flex items-start gap-3 mb-3"
                        style={{
                          background: '#F7F8FC', borderRadius: 11,
                          padding: '16px 18px',
                        }}
                      >
                        <div
                          className="shrink-0 flex items-center justify-center rounded-full"
                          style={{ width: 28, height: 28, background: '#1B76FF', color: '#fff' }}
                        >
                          <Info size={14} />
                        </div>
                        <p className="text-[12.5px] leading-relaxed" style={{ color: '#5A6069' }}>
                          {t('categories.emptyRulesCallout')}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {selectedRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={cn('flex items-center gap-2.5', !rule.isKeyword && 'cursor-pointer hover:border-primary/30')}
                          style={{
                            background: '#FAFBFD', border: '1px solid #EDEFF4',
                            borderRadius: 11, padding: '10px 12px',
                            transition: 'border-color 150ms',
                          }}
                          onClick={() => {
                            if (!rule.isKeyword) handleEditRule(rule as Rule);
                          }}
                        >
                          {/* Match type pill */}
                          <span
                            className="shrink-0 text-[10.5px] font-bold tracking-[.04em] px-2.5 py-1 rounded-[7px]"
                            style={{
                              background: 'rgba(27,118,255,.1)', color: '#1B76FF',
                            }}
                          >
                            {MATCH_TYPE_LABEL[rule.match_type] || rule.match_type}
                          </span>

                          {/* Pattern */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <Code2 size={12} className="shrink-0" style={{ color: '#B4BAC3' }} />
                            <code
                              className="text-[13px] font-mono truncate"
                              style={{ fontFamily: "'JetBrains Mono', Menlo, monospace", fontWeight: 500 }}
                            >
                              {rule.pattern.toLowerCase()}
                            </code>
                          </div>

                          {/* Account scope */}
                          {!rule.isKeyword && rule.account_id && (
                            <span className="shrink-0 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: '#E4E7EC', color: '#9AA1AC' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {accountNameById.get(rule.account_id) || ''}
                            </span>
                          )}

                          {/* Edit + Delete buttons */}
                          {!rule.isKeyword && (
                            <div className="shrink-0 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleEditRule(rule as Rule); }}
                                className="flex items-center justify-center rounded-lg transition-colors"
                                style={{ width: 28, height: 28, color: '#9AA1AC' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#EFF4FF'; e.currentTarget.style.color = '#1B76FF'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#9AA1AC'; }}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                                className="flex items-center justify-center rounded-lg transition-colors"
                                style={{ width: 28, height: 28, color: '#9AA1AC' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#FDEEE9'; e.currentTarget.style.color = '#C9502A'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#9AA1AC'; }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Built-in pattern examples for default categories */}
                    {!selected.isCustom && categoryExamples[selected.slug] && (
                      <div className="mt-3 mb-1">
                        <span className="text-[10.5px] font-semibold uppercase tracking-[.07em]" style={{ color: '#B4BAC3' }}>
                          {t('categories.builtInExamples', 'Auto-detected patterns')}
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {categoryExamples[selected.slug].map((ex) => (
                            <span
                              key={ex}
                              className="text-[11.5px] font-medium px-2.5 py-1 rounded-[7px]"
                              style={{ background: '#F1F3F8', color: '#9AA1AC' }}
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add rule inline */}
                    {!selected.isCustom && (
                      <div className="mt-2">
                        <div
                          className="flex items-center gap-2"
                          style={{
                            border: '1.5px dashed #CBD3DE', background: '#fff',
                            borderRadius: 11, padding: '8px 12px',
                          }}
                        >
                          {/* Match type selector */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowMatchTypeDropdown(!showMatchTypeDropdown)}
                              className="flex items-center gap-1 text-[10.5px] font-bold tracking-[.04em] px-2.5 py-1 rounded-[7px] transition-colors"
                              style={{ background: '#F1F3F8', color: '#5A6069' }}
                            >
                              {MATCH_TYPE_LABEL[newMatchType] || newMatchType}
                              <ChevronDown size={10} />
                            </button>
                            {showMatchTypeDropdown && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowMatchTypeDropdown(false)} />
                                <div
                                  className="absolute top-full left-0 mt-1 z-30 bg-white rounded-lg overflow-hidden"
                                  style={{
                                    boxShadow: '0 20px 40px -14px rgba(16,24,40,.28), 0 2px 6px rgba(16,24,40,.08)',
                                    minWidth: 120,
                                  }}
                                >
                                  {MATCH_TYPE_OPTIONS.map((mt) => (
                                    <button
                                      key={mt}
                                      type="button"
                                      onClick={() => { setNewMatchType(mt); setShowMatchTypeDropdown(false); }}
                                      className={cn(
                                        'w-full text-left px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[#F7F8FC]',
                                        newMatchType === mt ? 'text-primary font-semibold bg-primary/5' : 'text-foreground',
                                      )}
                                    >
                                      {MATCH_TYPE_LABEL[mt]}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Pattern input */}
                          <input
                            type="text"
                            value={newPattern}
                            onChange={(e) => setNewPattern(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddRuleInline(); }}
                            placeholder={addRulePlaceholder}
                            className="flex-1 min-w-0 text-[13px] bg-transparent outline-none placeholder:text-[#B4BAC3]"
                            style={{ fontFamily: "'JetBrains Mono', Menlo, monospace", fontWeight: 500 }}
                          />

                          {/* Add button */}
                          <button
                            type="button"
                            onClick={handleAddRuleInline}
                            disabled={!newPattern.trim() || addRule.isPending}
                            className="shrink-0 text-[12px] font-semibold px-3.5 py-1.5 rounded-lg text-white transition-colors disabled:opacity-40"
                            style={{ background: '#1B76FF' }}
                          >
                            {t('categories.addRuleAction')}
                          </button>
                        </div>

                        {/* Preview match count */}
                        {newPattern.trim() && previewMatched.length > 0 && (
                          <p className="mt-1.5 text-[11.5px]" style={{ color: '#9AA1AC', paddingLeft: 2 }}>
                            {t('categories.createRulePopupDesc', { pattern: newPattern.trim().toLowerCase(), count: previewMatched.length })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suggestions section */}
                  {categorySuggestions.length > 0 && !selected.isCustom && (
                    <div style={{ padding: '0 22px 14px' }}>
                      <div
                        style={{
                          background: 'rgba(255,208,39,.14)',
                          border: '1px solid rgba(255,208,39,.4)',
                          borderRadius: 11,
                          padding: '13px 14px',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2.5">
                          <Sparkles size={14} style={{ color: '#B98708' }} />
                          <span className="text-[12.5px] font-semibold" style={{ color: '#8A6811' }}>
                            {t('categories.suggestionsForCategory')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categorySuggestions.slice(0, 6).map((s) => (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => handleSuggestionClick(s)}
                              className="flex items-center gap-1.5 text-[12px] transition-colors hover:bg-[#FFF8E1]"
                              style={{
                                background: '#fff',
                                border: '1px solid rgba(185,135,8,.3)',
                                borderRadius: 8,
                                padding: '5px 10px',
                              }}
                            >
                              <Plus size={12} style={{ color: '#B98708' }} />
                              <span className="font-medium font-mono" style={{ color: '#0C0D0E' }}>
                                {s.pattern.toLowerCase()}
                              </span>
                              <span className="text-[11px]" style={{ color: '#9AA1AC' }}>
                                · {s.count} tx
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent transactions */}
                  <div style={{ padding: '4px 22px 16px' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={14} style={{ color: '#5A6069' }} />
                      <span className="text-[14px] font-bold" style={{ color: '#0C0D0E' }}>
                        {t('categories.recentTransactions')}
                      </span>
                    </div>

                    {recentTx.length === 0 ? (
                      <div className="text-center py-4 border-t" style={{ borderColor: '#F3F5F9' }}>
                        <p className="text-[12.5px]" style={{ color: '#B4BAC3' }}>
                          {t('categories.noRecentTransactions')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        {recentTx.map((tx, i) => (
                          <div
                            key={tx.id}
                            className={cn('flex items-center gap-3 py-2.5', i > 0 && 'border-t')}
                            style={{ borderColor: '#F3F5F9' }}
                          >
                            <span className="shrink-0 text-[12px] font-medium tabular-nums" style={{ width: 62, color: '#9AA1AC' }}>
                              {formatDateShort(tx.date)}
                            </span>
                            <span className="flex-1 min-w-0 text-[13px] font-medium truncate" style={{ color: '#0C0D0E' }}>
                              {tx.description}
                            </span>
                            {tx.account_name && (
                              <span className="shrink-0 text-[11.5px] font-medium" style={{ color: '#9AA1AC' }}>
                                {tx.account_name}
                              </span>
                            )}
                            <span
                              className="shrink-0 text-[13px] font-semibold tabular-nums text-right"
                              style={{
                                width: 92,
                                color: tx.amount > 0 ? '#217A49' : tx.amount < 0 ? '#C24A22' : '#9AA1AC',
                              }}
                            >
                              {formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="shrink-0 flex items-center gap-2"
                  style={{
                    padding: '12px 22px',
                    background: '#FAFBFD',
                    borderTop: '1px solid #F3F5F9',
                  }}
                >
                  <Info size={13} className="shrink-0" style={{ color: '#9AA1AC' }} />
                  <span className="flex-1 text-[11.5px]" style={{ color: '#9AA1AC' }}>
                    {t('categories.footerDisclaimer')}
                  </span>
                  {selected.isCustom ? (
                    <button
                      type="button"
                      onClick={handleDeleteCustomCategory}
                      className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: '#fff', border: '1px solid #F2D4C8', color: '#C9502A',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FDEEE9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                    >
                      {t('categories.deleteCustomCategory')}
                    </button>
                  ) : (
                    <span
                      className="shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                      style={{ background: '#F1F3F8', color: '#9AA1AC' }}
                    >
                      <Lock size={11} />
                      {t('categories.defaultLocked')}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                {t('categories.noCategoriesYet')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateCategoryDialog
        open={showCreateCategory}
        onClose={() => { setShowCreateCategory(false); setEditingCustomCategory(null); }}
        onSave={handleCreateCategory}
        isSaving={isSaving}
        editingCategory={editingCustomCategory}
      />

      <AddRuleDialog
        open={!!editDialogState}
        category={editDialogState?.category ?? null}
        editingRule={editDialogState?.editingRule}
        onClose={() => setEditDialogState(null)}
        onSave={handleEditDialogSave}
        isSaving={updateRule.isPending}
      />

      {/* Create rule popup — replaces inline retroactive options */}
      <Dialog
        open={showCreateRulePopup}
        onOpenChange={(o) => {
          if (!o) {
            setShowCreateRulePopup(false);
            setRetroScope('all');
            setCustomSince('');
            setNewRuleAccountScope(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                style={{ backgroundColor: `hsl(${selectedHsl} / 0.15)`, color: selectedColor }}
              >
                <RenderIcon name={selectedIcon} size={18} />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  {t('categories.createRule')}
                </span>
                <span className="text-base font-semibold text-foreground">{selected?.name}</span>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Pattern display */}
            <div
              className="flex items-center gap-2.5"
              style={{ background: '#FAFBFD', border: '1px solid #EDEFF4', borderRadius: 11, padding: '10px 14px' }}
            >
              <span
                className="shrink-0 text-[10.5px] font-bold tracking-[.04em] px-2.5 py-1 rounded-[7px]"
                style={{ background: 'rgba(27,118,255,.1)', color: '#1B76FF' }}
              >
                {MATCH_TYPE_LABEL[newMatchType] || newMatchType}
              </span>
              <code
                className="flex-1 text-[13px] font-mono truncate"
                style={{ fontFamily: "'JetBrains Mono', Menlo, monospace", fontWeight: 500 }}
              >
                {newPattern.trim().toLowerCase()}
              </code>
            </div>

            {/* Match count info */}
            {previewMatched.length > 0 && (
              <p className="text-[13px]" style={{ color: '#5A6069' }}>
                {t('categories.createRulePopupDesc', { pattern: newPattern.trim().toLowerCase(), count: previewMatched.length })}
              </p>
            )}

            {/* Account scope */}
            {activeAccounts.length > 1 && (
              <AccountScopeSelect
                accounts={accounts}
                value={newRuleAccountScope}
                onChange={setNewRuleAccountScope}
              />
            )}

            {/* Retroactive scope */}
            {previewMatched.length > 0 && (
              <RetroactiveApplyOptions
                transactions={previewMatched}
                scope={retroScope}
                onScopeChange={setRetroScope}
                customSince={customSince}
                onCustomSinceChange={setCustomSince}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateRulePopup(false);
                setRetroScope('all');
                setCustomSince('');
                setNewRuleAccountScope(null);
              }}
              className="text-[13px] font-medium px-4 py-2 rounded-lg transition-colors hover:bg-muted"
              style={{ color: '#5A6069' }}
            >
              {t('categories.cancel')}
            </button>
            <button
              type="button"
              onClick={handleCreateRuleFromPopup}
              disabled={addRule.isPending}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-40"
              style={{ background: '#1B76FF' }}
            >
              {t('categories.createRule')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
