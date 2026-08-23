import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PillBadge, type PillTone } from "@/components/ui/pill-badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  FilterToolbar,
  ToolbarButton,
  ToolbarDivider,
  ToolbarSearch,
  FilterChip,
  Filter as FilterIcon,
  ArrowUpDown,
  EyeOff,
} from "@/components/ui/filter-chip";
import { Transaction, Category } from "@/lib/mockData";
import { ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_CATEGORIES } from "@/lib/categoryTranslations";
import { TransactionCardList } from "./TransactionCardList";

interface TransactionTableProps {
  transactions: Transaction[];
  initialSearch?: string;
  totalCount?: number;
}

type MovementType = 'income' | 'expense' | 'transfer' | 'investment';

const movementBadgeTone: Record<MovementType, PillTone> = {
  income: 'green',
  expense: 'red',
  transfer: 'neutral',
  investment: 'blue',
};

const movementDotColor: Record<MovementType, string> = {
  income: '#2E9E6B',
  expense: '#E0704A',
  transfer: '#8A919C',
  investment: '#1B76FF',
};

const categoriesByMovement: Record<MovementType, string[]> = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
  transfer: TRANSFER_CATEGORIES,
  investment: ['investment', 'to_investment'],
};

const getMovementType = (transaction: Transaction): MovementType => {
  if (transaction.movement === 'INCOME' || transaction.type === 'income') return 'income';
  if (transaction.movement === 'TRANSFER' || transaction.type === 'transfer') return 'transfer';
  if (transaction.category === 'investment' || transaction.category === 'to_investment') return 'investment';
  return 'expense';
};

export function TransactionTable({ transactions, initialSearch = "", totalCount }: TransactionTableProps) {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);
  const { formatCurrency, formatDate } = useLocalization();
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const movementOptions: { value: MovementType; label: string }[] = [
    { value: 'income', label: t('stats.income') },
    { value: 'expense', label: t('stats.expenses') },
    { value: 'transfer', label: t('transactions.transfer', { defaultValue: 'Transfer' }) },
    { value: 'investment', label: t('investments.title') },
  ];

  const movementLabels: Record<MovementType, string> = {
    income: t('stats.income'),
    expense: t('stats.expenses'),
    transfer: t('transactions.transfer', { defaultValue: 'Transfer' }),
    investment: t('investments.title'),
  };

  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...TRANSFER_CATEGORIES];
  
  const availableCategories = selectedMovements.length === 0 || selectedMovements.length === movementOptions.length
    ? allCategories
    : selectedMovements.flatMap(m => categoriesByMovement[m as MovementType] || []);

  const allMovementsSelected = selectedMovements.length === movementOptions.length;
  const allCategoriesSelected = selectedCategories.length === availableCategories.length;

  const toggleMovement = (value: string) => {
    setSelectedMovements(prev => {
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      // Reset categories that are no longer available
      if (next.length > 0 && next.length < movementOptions.length) {
        const newAvailable = next.flatMap(m => categoriesByMovement[m as MovementType] || []);
        setSelectedCategories(prev => prev.filter(c => newAvailable.includes(c)));
      }
      return next;
    });
  };

  const toggleCategory = (value: string) => {
    setSelectedCategories(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleAllMovements = () => {
    if (allMovementsSelected) {
      setSelectedMovements([]);
    } else {
      setSelectedMovements(movementOptions.map(o => o.value));
    }
  };

  const toggleAllCategories = () => {
    if (allCategoriesSelected) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...availableCategories]);
    }
  };

  const computedBalanceMap = useMemo(() => {
    const byAccount = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      const key = tx.account || tx.bank || '__unknown__';
      if (!byAccount.has(key)) byAccount.set(key, []);
      byAccount.get(key)!.push(tx);
    }

    const map = new Map<string, number>();

    for (const [, accountTxs] of byAccount) {
      const sorted = [...accountTxs].sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        const order = { income: 0, transfer: 1, expense: 2 };
        const typeA = getMovementType(a);
        const typeB = getMovementType(b);
        return (order[typeA === 'investment' ? 'expense' : typeA] || 2) - (order[typeB === 'investment' ? 'expense' : typeB] || 2);
      });

      let startingBalance = 0;
      const firstWithBalance = sorted.find(tx => tx.runningBalance != null);
      if (firstWithBalance) {
        const idx = sorted.indexOf(firstWithBalance);
        let sumUpTo = 0;
        for (let i = 0; i <= idx; i++) sumUpTo += sorted[i].amount;
        startingBalance = firstWithBalance.runningBalance! - sumUpTo;
      }

      let balance = startingBalance;
      for (const tx of sorted) {
        balance += tx.amount;
        map.set(tx.id, Math.round(balance * 100) / 100);
      }
    }

    return map;
  }, [transactions]);

  const filteredTransactions = useMemo(() => transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || allCategoriesSelected || selectedCategories.includes(t.category);
    const movementType = getMovementType(t);
    const matchesMovement = selectedMovements.length === 0 || allMovementsSelected || selectedMovements.includes(movementType);
    return matchesSearch && matchesCategory && matchesMovement;
  }), [transactions, search, selectedCategories, allCategoriesSelected, selectedMovements, allMovementsSelected]);

  const formatTransactionDate = (dateStr: string) => formatDate(dateStr);

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return { month, year };
  };

  const movementFilterLabel = selectedMovements.length === 0 || allMovementsSelected
    ? tc('viewAll')
    : selectedMovements.map(m => movementLabels[m as MovementType]).join(', ');

  const categoryFilterLabel = selectedCategories.length === 0 || allCategoriesSelected
    ? tc('viewAll')
    : selectedCategories.map(c => getCategoryLabel(c)).join(', ');

  return (
    <Card variant="bento" className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-2 pt-0 px-0">
        <CardTitle>
          {t('transactions.title')}
        </CardTitle>
        {/* Airtable-style toolbar */}
        <FilterToolbar className="mt-3">
          <ToolbarButton icon={<EyeOff className="w-3.5 h-3.5" />} label={t('transactions.fields', { defaultValue: 'Fields' })} />
          <ToolbarButton
            icon={<FilterIcon className="w-3.5 h-3.5" />}
            label={t('transactions.filter', { defaultValue: 'Filter' })}
            active={!allMovementsSelected && selectedMovements.length > 0 || !allCategoriesSelected && selectedCategories.length > 0}
          />
          <ToolbarButton icon={<ArrowUpDown className="w-3.5 h-3.5" />} label={t('transactions.sort', { defaultValue: 'Sort' })} />
          <ToolbarDivider />

          {/* Movement filter chip */}
          <FilterChip
            field={t('transactions.movement', { defaultValue: 'Movement' })}
            value={movementFilterLabel}
            active={selectedMovements.length > 0 && !allMovementsSelected}
            onRemove={selectedMovements.length > 0 && !allMovementsSelected ? () => setSelectedMovements([]) : undefined}
          >
            <div className="flex flex-col gap-0.5">
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={allMovementsSelected || selectedMovements.length === 0}
                  onCheckedChange={toggleAllMovements}
                />
                <span className="text-sm">{tc('viewAll')}</span>
              </label>
              {movementOptions.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={selectedMovements.includes(opt.value)}
                    onCheckedChange={() => toggleMovement(opt.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </FilterChip>

          {/* Category filter chip */}
          <FilterChip
            field={t('transactions.category')}
            value={categoryFilterLabel}
            active={selectedCategories.length > 0 && !allCategoriesSelected}
            onRemove={selectedCategories.length > 0 && !allCategoriesSelected ? () => setSelectedCategories([]) : undefined}
          >
            <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={allCategoriesSelected || selectedCategories.length === 0}
                  onCheckedChange={toggleAllCategories}
                />
                <span className="text-sm">{tc('viewAll')}</span>
              </label>
              {availableCategories.map(cat => (
                <label key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={selectedCategories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  <CategoryIcon
                    iconName={getCategoryIcon(cat)}
                    colorVar={getCategoryColor(cat)}
                    size="sm"
                    showBackground={false}
                  />
                  <span className="text-sm">{getCategoryLabel(cat)}</span>
                </label>
              ))}
            </div>
          </FilterChip>

          <div className="flex-1" />
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder={tc('search')}
            className="w-full md:w-56"
          />
        </FilterToolbar>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {/* Mobile: stacked card list */}
        <div className="md:hidden">
          <TransactionCardList
            transactions={filteredTransactions}
            emptyLabel={t('transactions.noTransactions')}
          />
          <p className="text-sm text-muted-foreground mt-3">
            {filteredTransactions.length} / {totalCount ?? transactions.length}
          </p>
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block">
        <DataTable>
          <DataTableHeader>
            <DataTableRow className="hover:bg-transparent">
              <DataTableHead type="date" className="w-[100px]">{t('transactions.date')}</DataTableHead>
              <DataTableHead type="text">{t('transactions.description')}</DataTableHead>
              <DataTableHead type="movement" className="hidden md:table-cell w-[120px]">{t('transactions.movement', { defaultValue: 'Type' })}</DataTableHead>
              <DataTableHead type="select" className="hidden md:table-cell w-[180px]">{t('transactions.category')}</DataTableHead>
              <DataTableHead type="account" className="hidden lg:table-cell w-[130px]">{t('transactions.bank', { defaultValue: 'Account' })}</DataTableHead>
              <DataTableHead type="currency" numeric className="w-[110px]">{t('transactions.amount')}</DataTableHead>
              <DataTableHead type="number" numeric className="hidden lg:table-cell w-[100px]">{t('transactions.balance', { defaultValue: 'Balance' })}</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {filteredTransactions.length === 0 ? (
              <DataTableRow className="hover:bg-transparent">
                <DataTableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {t('transactions.noTransactions')}
                </DataTableCell>
              </DataTableRow>
            ) : (
              filteredTransactions.map((transaction) => {
                const movementType = getMovementType(transaction);
                const isTransfer = movementType === 'transfer';
                const dotColor = movementDotColor[movementType];
                return (
                  <DataTableRow key={transaction.id}>
                    <DataTableCell className="whitespace-nowrap text-[13px] text-[#8A919C]">
                      {formatTransactionDate(transaction.date)}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-start gap-2">
                        <span className="break-words line-clamp-1 text-[13px] text-[#0C0D0E]">
                          {transaction.description.replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, '').trim()}
                        </span>
                        {transaction.userCorrected && (
                          <span
                            title={t('transactions.edited')}
                            className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning-foreground"
                          >
                            {t('transactions.edited')}
                          </span>
                        )}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="hidden md:table-cell">
                      <PillBadge
                        tone={movementBadgeTone[movementType]}
                        icon={<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
                      >
                        {movementLabels[movementType]}
                      </PillBadge>
                    </DataTableCell>
                    <DataTableCell className="hidden md:table-cell">
                      <PillBadge colorVar={getCategoryColor(transaction.category)}>
                        <CategoryIcon
                          iconName={getCategoryIcon(transaction.category)}
                          colorVar={getCategoryColor(transaction.category)}
                          size="sm"
                          showBackground={false}
                        />
                        <span className="truncate max-w-[120px]" title={getCategoryLabel(transaction.category)}>
                          {getCategoryLabel(transaction.category)}
                        </span>
                      </PillBadge>
                    </DataTableCell>
                    <DataTableCell className="hidden lg:table-cell text-[13px] text-[#8A919C]">
                      <span className="truncate block">{transaction.account}</span>
                    </DataTableCell>
                    <DataTableCell
                      numeric
                      className={cn(
                        "text-[13px] font-medium tabular-nums",
                        isTransfer ? "text-[#8A919C]" : "text-[#0C0D0E]",
                      )}
                    >
                      {transaction.amount >= 0 ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </DataTableCell>
                    <DataTableCell numeric className="hidden lg:table-cell text-[13px] font-normal text-[#8A919C] tabular-nums">
                      {computedBalanceMap.has(transaction.id)
                        ? formatCurrency(computedBalanceMap.get(transaction.id)!)
                        : '—'}
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>

        {/* Footer */}
        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between bg-[#FAFBFC] border-t border-[#F1F2F4] px-3 py-2.5 rounded-b-xl">
            <div className="flex items-center gap-4 text-[13px] text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6B]" />
                {filteredTransactions.filter(tx => getMovementType(tx) === 'income').length} {t('stats.income').toLowerCase()}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E0704A]" />
                {filteredTransactions.filter(tx => getMovementType(tx) === 'expense').length} {t('stats.expenses').toLowerCase()}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A919C]" />
                {filteredTransactions.filter(tx => getMovementType(tx) === 'transfer').length} {t('transactions.transfer', { defaultValue: 'transfers' }).toLowerCase()}
              </span>
            </div>
            {(() => {
              const last = filteredTransactions[filteredTransactions.length - 1];
              const closingBalance = last ? computedBalanceMap.get(last.id) : undefined;
              return closingBalance !== undefined ? (
                <span className="text-[13px] font-semibold tabular-nums text-foreground">
                  {t('transactions.closingBalance', { defaultValue: 'Closing balance' })} {formatCurrency(closingBalance)}
                </span>
              ) : null;
            })()}
          </div>
        )}
        <p className="text-[12px] text-[#9AA1AC] mt-2">
          {filteredTransactions.length} / {totalCount ?? transactions.length}
        </p>
        </div>
      </CardContent>
    </Card>
  );
}