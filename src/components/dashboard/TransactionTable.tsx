import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { PillBadge, type PillTone } from "@/components/ui/pill-badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  ToolbarButton,
  ToolbarSearch,
  Filter as FilterIcon,
  ArrowUpDown,
} from "@/components/ui/filter-chip";
import { Transaction } from "@/lib/mockData";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import { TransactionCardList } from "./TransactionCardList";

interface TransactionTableProps {
  transactions: Transaction[];
  initialSearch?: string;
  totalCount?: number;
  monthKey?: string;
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

const getMovementType = (transaction: Transaction): MovementType => {
  if (transaction.movement === 'INCOME' || transaction.type === 'income') return 'income';
  if (transaction.movement === 'TRANSFER' || transaction.type === 'transfer') return 'transfer';
  if (transaction.category === 'investment' || transaction.category === 'to_investment') return 'investment';
  return 'expense';
};

export function TransactionTable({ transactions, initialSearch = "", totalCount, monthKey }: TransactionTableProps) {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const [search, setSearch] = useState(initialSearch);
  const { formatCurrency } = useLocalization();
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const movementLabels: Record<MovementType, string> = {
    income: t('stats.income'),
    expense: t('stats.expenses'),
    transfer: t('transactions.transfer', { defaultValue: 'Transfer' }),
    investment: t('investments.title'),
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
    return matchesSearch;
  }), [transactions, search]);

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const handleEditInData = () => {
    const params = new URLSearchParams({ tab: 'bank' });
    if (monthKey) params.set('month', monthKey);
    navigate(`/my-data?${params.toString()}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-[22px] pb-[14px]">
        <div className="flex flex-col items-start gap-[3px]">
          <h3 className="text-[15px] font-heading font-semibold text-[#0C0D0E] leading-tight">
            {t('transactions.title')}
          </h3>
          <button
            type="button"
            onClick={handleEditInData}
            className="inline-flex items-center gap-[6px] text-[12px] font-normal text-primary lowercase hover:underline"
          >
            {t('transactions.editInData')}
            <ChevronRight className="w-[13px] h-[13px]" strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex items-center gap-[6px]">
          <ToolbarButton
            icon={<ArrowUpDown className="w-[14px] h-[14px] text-[#8A919C]" strokeWidth={1.9} />}
            label={t('transactions.sort', { defaultValue: 'Sort' })}
            className="h-[31px] px-[11px] bg-[#F5F7F9] rounded-[9px] text-[13px] font-medium text-[#414750] gap-[6px] hover:bg-[#EBEEF2]"
          />
          <ToolbarButton
            icon={<FilterIcon className="w-[14px] h-[14px] text-[#8A919C]" strokeWidth={1.9} />}
            label={t('transactions.filter', { defaultValue: 'Filter' })}
            className="h-[31px] px-[11px] bg-[#F5F7F9] rounded-[9px] text-[13px] font-medium text-[#414750] gap-[6px] hover:bg-[#EBEEF2]"
          />
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder={tc('search')}
            className="w-[172px] [&_input]:h-[31px] [&_input]:bg-[#F5F7F9] [&_input]:rounded-[9px] [&_input]:border-0 [&_input]:text-[13px] [&_input]:placeholder:text-[#B4BAC3] [&_input]:pl-[30px] [&_.absolute.left-2]:text-[#B4BAC3] [&_svg]:w-[14px] [&_svg]:h-[14px]"
          />
        </div>
      </div>

      {/* Mobile: stacked card list */}
      <div className="md:hidden px-[22px]">
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
        <DataTable className="rounded-none bg-transparent">
          <DataTableHeader>
            <DataTableRow className="hover:bg-transparent">
              <DataTableHead type="date" className="w-[96px] pl-[22px]">{t('transactions.date')}</DataTableHead>
              <DataTableHead type="account" className="w-[130px]">{t('transactions.bank', { defaultValue: 'Account' })}</DataTableHead>
              <DataTableHead type="text">{t('transactions.description')}</DataTableHead>
              <DataTableHead type="movement" className="w-[132px]">{t('transactions.type')}</DataTableHead>
              <DataTableHead type="select" className="w-[176px]">{t('transactions.category')}</DataTableHead>
              <DataTableHead type="currency" numeric className="w-[106px]">{t('transactions.amount')}</DataTableHead>
              <DataTableHead type="number" numeric className="w-[106px] pr-[22px]">{t('transactions.balance', { defaultValue: 'Balance' })}</DataTableHead>
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
                    <DataTableCell className="whitespace-nowrap text-[13px] text-[#6B7280] tabular-nums pl-[22px]">
                      {formatShortDate(transaction.date)}
                    </DataTableCell>
                    <DataTableCell className="text-[12.5px] text-[#6B7280] pr-[12px]">
                      <span className="truncate block max-w-[118px]">{transaction.account}</span>
                    </DataTableCell>
                    <DataTableCell className="pr-[16px]">
                      <span className="block truncate text-[13.5px] text-[#0C0D0E]">
                        {transaction.description.replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, '').trim()}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      <PillBadge
                        tone={movementBadgeTone[movementType]}
                        icon={<span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
                      >
                        {movementLabels[movementType]}
                      </PillBadge>
                    </DataTableCell>
                    <DataTableCell>
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
                    <DataTableCell
                      numeric
                      className={cn(
                        "text-[13px] font-medium tabular-nums",
                        isTransfer ? "text-[#8A919C]" : "text-[#0C0D0E]",
                      )}
                    >
                      {isTransfer
                        ? `${transaction.amount >= 0 ? '+' : '−'}${formatCurrency(Math.abs(transaction.amount))}`
                        : formatCurrency(transaction.amount)}
                    </DataTableCell>
                    <DataTableCell numeric className="text-[13px] font-normal text-[#8A919C] tabular-nums pr-[22px]">
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
          <div className="flex items-center justify-between bg-[#FAFBFC] border-t border-[#F1F2F4] px-[22px] py-2.5">
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
        <p className="text-[12px] text-[#9AA1AC] mt-2 px-[22px]">
          {filteredTransactions.length} / {totalCount ?? transactions.length}
        </p>
      </div>
    </div>
  );
}
