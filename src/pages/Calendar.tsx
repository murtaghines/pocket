import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus, Minus, ArrowRightLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useMonthSelection } from "@/hooks/usePeriodSelection";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocalization } from "@/hooks/useLocalization";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/mockData";

function getCalendarDays(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = (firstDay.getDay() + 6) % 7;

  const days: { date: Date; inMonth: boolean; key: string }[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    days.push({ date: d, inMonth: false, key: d.toISOString().slice(0, 10) });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month - 1, d);
    days.push({ date, inMonth: true, key: date.toISOString().slice(0, 10) });
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month, d);
      days.push({ date, inMonth: false, key: date.toISOString().slice(0, 10) });
    }
  }

  return days;
}

function TransactionEvent({ tx, formatCurrency }: { tx: Transaction; formatCurrency: (n: number) => string }) {
  const isIncome = tx.movement === "INCOME";
  const isTransfer = tx.movement === "TRANSFER";

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1.5 py-[3px] rounded text-[11px] leading-tight truncate",
        isIncome
          ? "bg-success/10 text-success"
          : isTransfer
            ? "bg-muted text-muted-foreground"
            : "bg-destructive/10 text-destructive",
      )}
    >
      {isIncome ? (
        <Plus className="w-3 h-3 shrink-0" strokeWidth={2.5} />
      ) : isTransfer ? (
        <ArrowRightLeft className="w-3 h-3 shrink-0" strokeWidth={2} />
      ) : (
        <Minus className="w-3 h-3 shrink-0" strokeWidth={2.5} />
      )}
      <span className="truncate">{tx.description}</span>
      <span className="ml-auto tabular-nums font-medium shrink-0">{formatCurrency(Math.abs(tx.amount))}</span>
    </div>
  );
}

function DaySummary({ income, expense }: { income: number; expense: number }) {
  if (income === 0 && expense === 0) return null;
  return (
    <div className="flex items-center gap-2 mt-auto pt-1 border-t border-border/50">
      {income > 0 && <span className="text-[10px] tabular-nums font-medium text-success">+{income.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
      {expense > 0 && <span className="text-[10px] tabular-nums font-medium text-destructive">−{expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
    </div>
  );
}

const MAX_VISIBLE = 3;

export default function Calendar() {
  const { t, i18n } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");
  const { formatCurrency, formatMonth } = useLocalization();
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonthSelection();

  const monthKey = selectedMonth ?? new Date().toISOString().slice(0, 7);
  const [yearNum, monthNum] = monthKey.split("-").map(Number);
  const startDate = `${monthKey}-01`;
  const lastDate = new Date(yearNum, monthNum, 0);
  const endDate = `${monthKey}-${String(lastDate.getDate()).padStart(2, "0")}`;

  const { transactions } = useTransactions({ startDate, endDate });

  const txByDate = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const tx of transactions) {
      const d = tx.date.slice(0, 10);
      (map[d] ??= []).push(tx);
    }
    return map;
  }, [transactions]);

  const calendarDays = useMemo(() => getCalendarDays(monthKey), [monthKey]);

  const today = new Date().toISOString().slice(0, 10);

  const idx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
  const hasOlder = idx < availableMonths.length - 1;
  const hasNewer = idx > 0;
  const monthLabel = formatMonth(monthKey + "-01");

  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i + 1);
      return formatter.format(d);
    });
  }, [i18n.language]);

  return (
    <DashboardLayout>
      <div className="px-3 md:px-[34px]">
      <div className="hidden md:flex items-center justify-between py-[18px] sticky top-0 z-30 bg-background">
        <h1 className="text-[21px] font-heading font-semibold text-foreground tracking-[-0.01em] capitalize">
          {monthLabel}
        </h1>
        <div className="flex items-center gap-2">
          <span className="flex items-center bg-card rounded-[10px] p-[5px] shadow-[0_1px_2px_rgba(16,24,40,.05)]">
            <button type="button" onClick={() => hasOlder && setSelectedMonth(availableMonths[idx + 1])} disabled={!hasOlder} aria-label="Previous month" className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] disabled:opacity-30 hover:bg-muted/60 transition-colors">
              <ChevronLeft className="w-[14px] h-[14px] text-foreground/80" strokeWidth={2.2} />
            </button>
            <span className="capitalize min-w-[88px] text-center text-[13px] font-medium text-foreground/80">{monthLabel}</span>
            <button type="button" onClick={() => hasNewer && setSelectedMonth(availableMonths[idx - 1])} disabled={!hasNewer} aria-label="Next month" className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] disabled:opacity-30 hover:bg-muted/60 transition-colors">
              <ChevronRight className="w-[14px] h-[14px] text-foreground/80" strokeWidth={2.2} />
            </button>
          </span>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-section overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekdays.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayTx = txByDate[day.key] ?? [];
            const isToday = day.key === today;
            const income = dayTx.filter((t) => t.movement === "INCOME").reduce((s, t) => s + Math.abs(t.amount), 0);
            const expense = dayTx.filter((t) => t.movement === "EXPENSE").reduce((s, t) => s + Math.abs(t.amount), 0);
            const overflow = dayTx.length - MAX_VISIBLE;

            return (
              <div
                key={day.key}
                className={cn(
                  "min-h-[120px] p-1.5 border-b border-r border-border/50 flex flex-col",
                  !day.inMonth && "bg-muted/30",
                  i % 7 === 0 && "border-l-0",
                )}
              >
                <span
                  className={cn(
                    "text-[12px] font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground",
                    !isToday && day.inMonth && "text-foreground",
                    !isToday && !day.inMonth && "text-muted-foreground/50",
                  )}
                >
                  {day.date.getDate()}
                </span>
                <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                  {dayTx.slice(0, MAX_VISIBLE).map((tx) => (
                    <TransactionEvent key={tx.id} tx={tx} formatCurrency={formatCurrency} />
                  ))}
                  {overflow > 0 && (
                    <span className="text-[10px] text-muted-foreground font-medium px-1.5">
                      +{overflow} {tc("viewAll").toLowerCase()}
                    </span>
                  )}
                </div>
                <DaySummary income={income} expense={expense} />
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
