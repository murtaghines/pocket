import { WorkspaceBanner } from '@/components/layout/WorkspaceShell';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Info, Sparkles, Calendar, Code2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { useCategorizationRules, type Rule, buildDbRuleFields } from '@/hooks/useCategorizationRules';
import { useCustomCategories, type CustomCategoryRule } from '@/hooks/useCustomCategories';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { useSuggestions, type Suggestion } from '@/hooks/useSuggestions';
import { useCategoryTransactions } from '@/hooks/useCategoryTransactions';
import { useLocalization } from '@/hooks/useLocalization';
import { useRulePreview, findMatchingTransactions } from '@/hooks/useRulePreview';
import { useToast } from '@/hooks/use-toast';
import { useAccounts } from '@/hooks/useAccounts';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { RuleModal } from './RuleModal';
import { EditCategoryModal } from './EditCategoryModal';
import type { MatchType as ModalMatchType } from '@/lib/matchExamples';
import { getLucideIcon } from '@/lib/lucideIcon';
import { cn } from '@/lib/utils';
import { getAccountDisplayName } from '@/lib/accountColors';
import { categoryExamples } from '@/lib/categoryExamples';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, TRANSFER_CATEGORIES } from '@/lib/categoryTranslations';
import type { Database } from '@/integrations/supabase/types';
import { MATCH_TYPES } from '@/lib/matchTypes';
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

const MATCH_TYPE_OPTIONS = MATCH_TYPES.map(mt => mt.value);

const MATCH_TYPE_LABEL: Record<string, string> = {
  SMART: 'SMART',
  CONTAINS: 'CONTAINS',
  STARTS_WITH: 'STARTS WITH',
  ENDS_WITH: 'ENDS WITH',
};

const MATCH_TYPE_INFO = MATCH_TYPES.map(mt => ({
  key: mt.value,
  label: MATCH_TYPE_LABEL[mt.value] || mt.value,
  helpKey: `matchHelp_${mt.value}`,
}));

function RenderIcon({ name, size = 18 }: { name: string; size?: number }) {
  const I = getLucideIcon(name);
  return I ? <I size={size} strokeWidth={2} /> : null;
}

const toModalMatchType = (dbType: string): ModalMatchType => {
  const map: Record<string, ModalMatchType> = { SMART: 'fuzzy', CONTAINS: 'contains', STARTS_WITH: 'starts_with', ENDS_WITH: 'ends_with' };
  return map[dbType] || 'fuzzy';
};

const fromModalMatchType = (mt: ModalMatchType): string => {
  const map: Record<ModalMatchType, string> = { fuzzy: 'SMART', contains: 'CONTAINS', starts_with: 'STARTS_WITH', ends_with: 'ENDS_WITH' };
  return map[mt];
};

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hslStr: string): string {
  const parts = hslStr.replace(/%/g, '').split(/\s+/).map(Number);
  const [h, s, l] = [parts[0] / 360, parts[1] / 100, parts[2] / 100];
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${v.toString(16).padStart(2, '0').repeat(3)}`;
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const rv = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const gv = Math.round(hue2rgb(p, q, h) * 255);
  const bv = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${rv.toString(16).padStart(2, '0')}${gv.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

type KeywordRuleRow = { id: string; pattern: string; match_type: string; isKeyword: true };
type DbRuleRow = {
  id: string; pattern: string; match_type: string;
  applied_count: number; last_applied_at: string | null; account_id: string | null;
  isKeyword: false;
};
type SelectedRuleRow = KeywordRuleRow | DbRuleRow;
// A guard rather than `!rule.isKeyword`: boolean-literal narrowing needs strictNullChecks, which this project doesn't enable.
const isDbRule = (r: SelectedRuleRow): r is DbRuleRow => !r.isKeyword;

export function CategoriesEditor() {
  const { t } = useTranslation('settings');
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency, formatDateShort } = useLocalization();
  const { getCategoryLabel, getCategoryIcon, getCategoryColor, getCategoryHsl } = useCategoryTranslations();
  const { incomeCategories, expenseCategories, transferCategories, isLoading: catsLoading } = useCategories('CASHFLOW');
  const { rules, isLoading: rulesLoading, addRule, updateRule, deleteRule, getRulesForCategory } = useCategorizationRules();
  const { customCategories, isSaving, addCustomCategory, updateCustomCategory, removeRule: removeCustomRule, rules: allCustomRules, getVisualOverride, setVisualOverride } = useCustomCategories();
  const { data: suggestions = [] } = useSuggestions();
  const { accounts } = useAccounts();

  const [searchParams, setSearchParams] = useSearchParams();
  const movementParam = searchParams.get('movement');
  const categoryParam = searchParams.get('category');
  const [activeTab, setActiveTab] = useState<TabKey>(
    movementParam === 'income' ? 'income' : movementParam === 'transfer' ? 'transfer' : 'expense'
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCustomCategory, setEditingCustomCategory] = useState<CustomCategoryRule | null>(null);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);

  // Inline add rule state
  const [newPattern, setNewPattern] = useState('');
  const [newMatchType, setNewMatchType] = useState<string>('SMART');
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  // Edit rule via modal
  const [editRuleState, setEditRuleState] = useState<{
    ruleId: string;
    pattern: string;
    matchType: ModalMatchType;
    accountId: string | null;
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

  // Build the merged category list for the sidebar, sorted to match the select dropdown order
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
    const orderArray = activeTab === 'income' ? INCOME_CATEGORIES
      : activeTab === 'transfer' ? TRANSFER_CATEGORIES
      : EXPENSE_CATEGORIES;
    items.sort((a, b) => {
      const idxA = orderArray.indexOf(a.slug);
      const idxB = orderArray.indexOf(b.slug);
      const posA = idxA >= 0 ? idxA : 9999;
      const posB = idxB >= 0 ? idxB : 9999;
      return posA - posB;
    });
    return items;
  }, [activeData, getCategoryLabel, allCustomRules, activeTab]);

  // Restore selected category from URL on first load
  useEffect(() => {
    if (categoryParam && categoryList.length > 0 && !selectedId) {
      const match = categoryList.find(c => c.slug === categoryParam);
      if (match) setSelectedId(match.id);
    }
  }, [categoryParam, categoryList, selectedId]);

  // Auto-select first category when tab changes or list loads
  const effectiveSelected = useMemo(() => {
    if (selectedId && categoryList.find(c => c.id === selectedId)) return selectedId;
    return categoryList[0]?.id || null;
  }, [selectedId, categoryList]);

  const selected = useMemo(() => categoryList.find(c => c.id === effectiveSelected) || null, [categoryList, effectiveSelected]);

  // Sync URL when tab or selected category changes
  useEffect(() => {
    if (!selected) return;
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'categories');
    params.set('movement', activeTab);
    params.set('category', selected.slug);
    const current = searchParams.toString();
    const next = params.toString();
    if (current !== next) setSearchParams(params, { replace: true });
  }, [activeTab, selected?.slug]);

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
  const selectedRules = useMemo<SelectedRuleRow[]>(() => {
    if (!selected) return [];
    if (selected.isCustom) {
      const custom = activeData.custom.find(c => c.slug === selected.slug);
      return (custom?.keywords || []).map((kw, i) => ({
        id: `kw-${i}`,
        pattern: kw,
        match_type: 'CONTAINS',
        isKeyword: true as const,
      }));
    }
    return getRulesForCategory(selected.id).map(r => ({
      id: r.id,
      pattern: r.pattern,
      match_type: r.match_type,
      applied_count: r.applied_count,
      last_applied_at: r.last_applied_at,
      account_id: r.account_id,
      isKeyword: false as const,
    }));
  }, [selected, activeData.custom, getRulesForCategory]);

  // Suggestions for the selected category's movement type
  const categorySuggestions = useMemo(() => {
    if (!selected) return [];
    return suggestions.filter(s => s.movement === selected.movement && s.categoryIds.includes(selected.id));
  }, [selected, suggestions]);

  // Recent transactions
  const { data: recentTx = [] } = useCategoryTransactions(
    selected ? selected.id : null
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
    enabled: !!selected && newPattern.trim().length > 0 && !showCreateRuleModal,
  });

  const handleSelectTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setSelectedId(null);
    setNewPattern('');
    setShowCreateRuleModal(false);
  }, []);

  const handleAddRuleInline = useCallback(() => {
    if (!selected || !newPattern.trim()) return;
    setShowCreateRuleModal(true);
  }, [selected, newPattern]);

  const handleCreateRuleConfirm = useCallback(async (payload: {
    pattern: string;
    matchType: ModalMatchType;
    accountId: string | null;
    applyToExisting: boolean;
  }) => {
    if (!selected || !user?.id) return;
    const dbMatchType = fromModalMatchType(payload.matchType);
    const { dbType, pattern: builtPattern, tokens } = buildDbRuleFields(
      payload.pattern, dbMatchType, selected.movement, selected.slug,
    );

    let matchedIds: string[] | undefined;
    if (payload.applyToExisting) {
      const matched = await findMatchingTransactions({
        userId: user.id,
        matchType: dbType as MatchType,
        pattern: builtPattern,
        tokens,
        movement: selected.movement,
        accountIds: payload.accountId ? [payload.accountId] : null,
      });
      matchedIds = matched.map(m => m.id);
    }

    addRule.mutate(
      {
        category_id: selected.id,
        pattern: builtPattern,
        match_type: dbType,
        tokens,
        prebuilt: true,
        matchingTransactionIds: matchedIds,
        account_id: payload.accountId,
      },
      {
        onSuccess: () => {
          if (matchedIds && matchedIds.length > 0) {
            toast({ title: t('categories.pastTransactionsUpdated', { count: matchedIds.length }) });
          } else {
            toast({ title: t('categories.ruleSaved') });
          }
          setNewPattern('');
          setShowCreateRuleModal(false);
        },
      },
    );
  }, [selected, user?.id, addRule, toast, t]);

  const handleDeleteRule = useCallback((ruleId: string) => {
    deleteRule.mutate(ruleId, {
      onSuccess: () => toast({ title: t('categories.ruleDeleted') }),
    });
  }, [deleteRule, toast, t]);

  const handleEditRule = useCallback((rule: Pick<Rule, 'id' | 'pattern' | 'match_type' | 'account_id'>) => {
    if (!selected) return;
    setEditRuleState({
      ruleId: rule.id,
      pattern: rule.pattern,
      matchType: toModalMatchType(rule.match_type),
      accountId: rule.account_id || null,
    });
  }, [selected]);

  const handleEditRuleConfirm = useCallback(async (payload: {
    pattern: string;
    matchType: ModalMatchType;
    accountId: string | null;
    applyToExisting: boolean;
  }) => {
    if (!editRuleState || !selected || !user?.id) return;
    const dbMatchType = fromModalMatchType(payload.matchType);
    const { dbType, pattern: builtPattern, tokens } = buildDbRuleFields(
      payload.pattern, dbMatchType, selected.movement, selected.slug,
    );

    let matchedIds: string[] | undefined;
    if (payload.applyToExisting) {
      const matched = await findMatchingTransactions({
        userId: user.id,
        matchType: dbType as MatchType,
        pattern: builtPattern,
        tokens,
        movement: selected.movement,
        accountIds: payload.accountId ? [payload.accountId] : null,
      });
      matchedIds = matched.map(m => m.id);
    }

    updateRule.mutate(
      {
        ruleId: editRuleState.ruleId,
        pattern: builtPattern,
        match_type: dbType,
        tokens,
        prebuilt: true,
        account_id: payload.accountId,
        matchingTransactionIds: matchedIds,
        category_id: selected.id,
        category: selected.slug,
        movement: selected.movement,
      },
      {
        onSuccess: () => {
          setEditRuleState(null);
          if (matchedIds && matchedIds.length > 0) {
            toast({ title: t('categories.pastTransactionsUpdated', { count: matchedIds.length }) });
          } else {
            toast({ title: t('categories.ruleSaved') });
          }
        },
      },
    );
  }, [editRuleState, selected, user?.id, updateRule, toast, t]);

  const handleEditRuleDelete = useCallback(() => {
    if (!editRuleState) return;
    deleteRule.mutate(editRuleState.ruleId, {
      onSuccess: () => {
        setEditRuleState(null);
        toast({ title: t('categories.ruleDeleted') });
      },
    });
  }, [editRuleState, deleteRule, toast, t]);

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
      <WorkspaceBanner
        title={t('categories.title')}
        subtitle={t('categories.bannerSubtitle', { ruleCount: rules.length, catCount: tabCounts.expense + tabCounts.income + tabCounts.transfer })}
        action={{ label: t('categories.newCategory'), onClick: () => setShowCreateCategory(true) }}
        selector={{
          value: activeTab,
          onChange: handleSelectTab,
          options: (['expense', 'income', 'transfer'] as TabKey[]).map((tab) => ({
            value: tab,
            label: tab === 'income' ? t('categories.income') : tab === 'transfer' ? t('categories.transfers') : t('categories.expenses'),
            count: tabCounts[tab],
          })),
        }}
      />

      {/* ====== Content wrapper (overlaps banner by 58px) ====== */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{ padding: '0 34px 32px', marginTop: -102 }}
      >
        <div className="grid h-full gap-4" style={{ gridTemplateColumns: '336px minmax(0,1fr)' }}>
          {/* ====== LEFT COLUMN — Sidebar ====== */}
          <div className="flex flex-col h-full">
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
                    <button
                      type="button"
                      onClick={() => setShowEditCategoryModal(true)}
                      className="relative group/icon flex items-center justify-center rounded-[16px] cursor-pointer"
                      style={{
                        width: 52, height: 52,
                        background: `hsl(${selectedHsl} / 0.15)`,
                        color: selectedColor,
                      }}
                    >
                      <span className="transition-opacity duration-150 group-hover/icon:opacity-30">
                        <RenderIcon name={selectedIcon} size={26} />
                      </span>
                      <span
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity duration-150"
                        style={{ color: '#5A6069' }}
                      >
                        <Pencil size={20} />
                      </span>
                    </button>

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

                    {/* Auto-detected patterns — top right */}
                    {!selected.isCustom && categoryExamples[selected.slug] && (
                      <div className="flex flex-col items-end gap-1 ml-auto max-w-[45%]">
                        <span className="text-[10px] font-medium uppercase tracking-[.07em]" style={{ color: '#B0B7C3' }}>
                          {t('categories.builtInExamples')}
                        </span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {categoryExamples[selected.slug].map((ex) => (
                            <span
                              key={ex}
                              className="text-[10.5px] font-medium px-2 py-0.5 rounded-[7px]"
                              style={{ background: '#F1F3F8', color: '#9AA1AC' }}
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
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
                          style={{ width: 26, height: 26, background: showInfoPopover ? '#EFF4FF' : '#F1F3F8', color: showInfoPopover ? '#1B76FF' : '#9AA1AC' }}
                        >
                          <Info size={14} />
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
                    <div className="space-y-2">
                      {selectedRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={cn('flex items-center gap-2.5', isDbRule(rule) && 'cursor-pointer hover:border-primary/30')}
                          style={{
                            background: '#FAFBFD', border: '1px solid #EDEFF4',
                            borderRadius: 11, padding: '10px 12px',
                            transition: 'border-color 150ms',
                          }}
                          onClick={() => {
                            if (isDbRule(rule)) handleEditRule(rule);
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
                          {isDbRule(rule) && rule.account_id && (
                            <span className="shrink-0 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white border" style={{ borderColor: '#E4E7EC', color: '#9AA1AC' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {accountNameById.get(rule.account_id) || ''}
                            </span>
                          )}

                          {/* Edit + Delete buttons */}
                          {isDbRule(rule) && (
                            <div className="shrink-0 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleEditRule(rule); }}
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
                          <div className="pk-select-wrap pk-select-wrap--sm shrink-0">
                            <select
                              value={newMatchType}
                              onChange={(e) => setNewMatchType(e.target.value)}
                              className="h-7 px-2 bg-[#F1F3F8] rounded-[7px] text-[10.5px] font-bold tracking-[.04em] cursor-pointer border-0"
                              style={{ color: '#5A6069' }}
                            >
                              {MATCH_TYPE_OPTIONS.map((mt) => (
                                <option key={mt} value={mt}>
                                  {MATCH_TYPE_LABEL[mt]}
                                </option>
                              ))}
                            </select>
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

                  {/* Recent transactions — pushed to bottom */}
                  <div className="mt-auto" style={{ padding: '4px 22px 16px' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={14} style={{ color: '#5A6069' }} />
                      <span className="text-[12.5px] font-semibold" style={{ color: '#0C0D0E' }}>
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

                {/* Footer — disclaimer + delete for custom */}
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
                  {selected.isCustom && (
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

      {/* Rule modal — create */}
      {selected && (
        <RuleModal
          open={showCreateRuleModal}
          onOpenChange={(o) => { if (!o) { setShowCreateRuleModal(false); setNewPattern(''); } }}
          mode="create"
          category={{ slug: selected.slug, label: selected.name, color: hslToHex(selectedHsl), icon: selectedIcon }}
          movementType={selected.movement}
          accounts={activeAccounts.map(a => ({ id: a.id, label: getAccountDisplayName(a) }))}
          initialPattern={newPattern}
          initialMatchType={toModalMatchType(newMatchType)}
          onConfirm={handleCreateRuleConfirm}
          isSaving={addRule.isPending}
        />
      )}

      {/* Rule modal — edit */}
      {selected && editRuleState && (
        <RuleModal
          open={!!editRuleState}
          onOpenChange={(o) => { if (!o) setEditRuleState(null); }}
          mode="edit"
          category={{ slug: selected.slug, label: selected.name, color: hslToHex(selectedHsl), icon: selectedIcon }}
          movementType={selected.movement}
          accounts={activeAccounts.map(a => ({ id: a.id, label: getAccountDisplayName(a) }))}
          ruleId={editRuleState.ruleId}
          initialPattern={editRuleState.pattern}
          initialMatchType={editRuleState.matchType}
          defaultAccountId={editRuleState.accountId}
          onConfirm={handleEditRuleConfirm}
          onDelete={handleEditRuleDelete}
          isSaving={updateRule.isPending}
        />
      )}

      {/* Edit category modal */}
      {selected && (
        <EditCategoryModal
          open={showEditCategoryModal}
          onOpenChange={setShowEditCategoryModal}
          category={{
            slug: selected.slug,
            label: selected.name,
            color: hslToHex(selectedHsl),
            icon: selectedIcon,
            deletable: selected.isCustom,
          }}
          onSave={async ({ label, color, icon }) => {
            await setVisualOverride(selected.slug, hexToHsl(color), icon, label);
            setShowEditCategoryModal(false);
          }}
          onDelete={selected.isCustom ? async () => {
            setShowEditCategoryModal(false);
            await handleDeleteCustomCategory();
          } : undefined}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
