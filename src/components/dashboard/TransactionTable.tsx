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
  openingBalance?: number | null;
}

type MovementType = 'income' | 'expense' | 'transfer' | 'investment';

const movementBadgeTone: Record<MovementType, PillTone> = {
  income: 'green',
  expense: 'red',
  transfer: 'neutral',
  investment: 'blue',
};

const movementDotColor: Record<MovementType, string> = {
  income: 'hsl(var(--success))',
  expense: 'hsl(var(--destructive))',
  transfer: 'hsl(var(--muted-foreground))',
  investment: 'hsl(var(--primary))',
};

const getMovementType = (transaction: Transaction): MovementType => {
  if (transaction.movement === 'INCOME' || transaction.type === 'income') return 'income';
  if (transaction.movement === 'TRANSFER' || transaction.type === 'transfer') return 'transfer';
  if (transaction.category === 'investment' || transaction.category === 'to_investment' || transaction.category === 'from_investment') return 'investment';
  return 'expense';
};

export function TransactionTable({ transactions, initialSearch = "", totalCount, monthKey, openingBalance }: TransactionTableProps) {
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
    const map = new Map<string, number>();
    if (openingBalance == null) return map;

    const sorted = [...transactions].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.fingerprint ?? a.id).localeCompare(b.fingerprint ?? b.id);
    });

    let balance = openingBalance;
    for (const tx of sorted) {
      balance += tx.amount;
      map.set(tx.id, Math.round(balance * 100) / 100);
    }

    return map;
  }, [transactions, openingBalance]);

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
      {/* Header — sticky at scroll-container top */}
      <div className="flex items-center justify-between gap-4 px-3 md:px-5 pb-[14px] sticky top-0 z-20 bg-card">
        <div className="flex flex-col items-start gap-[3px]">
          <h3 className="text-[15px] font-heading font-semibold text-foreground leading-tight">
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
            icon={<FilterIcon className="w-[14px] h-[14px] text-muted-foreground" strokeWidth={1.9} />}
            label={t('transactions.filter', { defaultValue: 'Filter' })}
            className="h-[31px] px-[11px] bg-muted rounded-[9px] text-[13px] font-medium text-foreground/80 gap-[6px] hover:bg-muted/80 [&>span:last-of-type]:hidden [&>span:last-of-type]:md:inline"
          />
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder={tc('search')}
            className="w-[120px] md:w-[172px] [&_input]:h-[31px] [&_input]:bg-muted [&_input]:rounded-[9px] [&_input]:border-0 [&_input]:text-[13px] [&_input]:placeholder:text-muted-foreground/60 [&_input]:pl-[30px] [&_.absolute.left-2]:text-muted-foreground/60 [&_svg]:w-[14px] [&_svg]:h-[14px]"
          />
        </div>
      </div>

      {/* Mobile: stacked card list */}
      <div className="md:hidden px-3">
        <TransactionCardList
          transactions={filteredTransactions}
          emptyLabel={t('transactions.noTransactions')}
        />
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block">
        <DataTable className="rounded-none bg-transparent overflow-visible">
          <DataTableHeader className="sticky top-[52px] z-10 [&_th]:bg-muted/50">
            <DataTableRow className="hover:bg-transparent">
              <DataTableHead type="date" className="w-[96px] pl-5">{t('transactions.date')}</DataTableHead>
              <DataTableHead type="account" className="w-[130px]">{t('transactions.bank', { defaultValue: 'Account' })}</DataTableHead>
              <DataTableHead type="text">{t('transactions.description')}</DataTableHead>
              <DataTableHead type="movement" className="w-[132px]">{t('transactions.type')}</DataTableHead>
              <DataTableHead type="select" className="w-[176px]">{t('transactions.category')}</DataTableHead>
              <DataTableHead type="currency" numeric className="w-[106px]">{t('transactions.amount')}</DataTableHead>
              <DataTableHead type="number" numeric className="w-[106px] pr-5">{t('transactions.balance', { defaultValue: 'Balance' })}</DataTableHead>
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
                    <DataTableCell className="whitespace-nowrap text-[13px] text-muted-foreground tabular-nums pl-5">
                      {formatShortDate(transaction.date)}
                    </DataTableCell>
                    <DataTableCell className="text-[12.5px] text-muted-foreground pr-[12px]">
                      <span className="truncate block max-w-[118px]">{transaction.account}</span>
                    </DataTableCell>
                    <DataTableCell className="pr-[16px]">
                      <span className="block truncate text-[13.5px] text-foreground">
                        {transaction.description}
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
                        isTransfer ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {isTransfer
                        ? `${transaction.amount >= 0 ? '+' : '−'}${formatCurrency(Math.abs(transaction.amount))}`
                        : formatCurrency(transaction.amount)}
                    </DataTableCell>
                    <DataTableCell numeric className="text-[13px] font-normal text-muted-foreground tabular-nums pr-5">
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

        {/* Footer — sticky at scroll-container bottom */}
        <div className="sticky bottom-0 z-20 bg-card">
          {filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between bg-muted/50 border-t border-border px-5 py-2.5">
              <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  {filteredTransactions.filter(tx => getMovementType(tx) === 'income').length} {t('stats.income').toLowerCase()}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {filteredTransactions.filter(tx => getMovementType(tx) === 'expense').length} {t('stats.expenses').toLowerCase()}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  {filteredTransactions.filter(tx => getMovementType(tx) === 'transfer').length} {t('transactions.transfer', { defaultValue: 'transfers' }).toLowerCase()}
                </span>
              </div>
              {(() => {
                const newest = filteredTransactions[0];
                const closingBalance = newest ? computedBalanceMap.get(newest.id) : undefined;
                return closingBalance !== undefined ? (
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">
                    {t('transactions.closingBalance', { defaultValue: 'Closing balance' })} {formatCurrency(closingBalance)}
                  </span>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
