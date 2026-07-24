import { useTranslation } from "react-i18next";
import { Receipt, Hash, TrendingDown, CalendarClock } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import type { TransactionStats } from "@/lib/analytics";

interface TransactionStatsCardProps {
  stats: TransactionStats;
}

/**
 * Compact month-level transaction behaviour tile: number of transactions, average expense ticket,
 * the single largest expense, and the costliest day of the month.
 */
export function TransactionStatsCard({ stats }: TransactionStatsCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const rows: Array<{ icon: React.ReactNode; label: string; value: string; hint?: string }> = [
    {
      icon: <Hash className="w-4 h-4" strokeWidth={2} />,
      label: t("insights.txStats.count"),
      value: String(stats.expenseCount),
    },
    {
      icon: <Receipt className="w-4 h-4" strokeWidth={2} />,
      label: t("insights.txStats.avgTicket"),
      value: formatCurrency(stats.avgTicket),
    },
    {
      icon: <TrendingDown className="w-4 h-4" strokeWidth={2} />,
      label: t("insights.txStats.largest"),
      value: stats.largest ? formatCurrency(stats.largest.amount) : "—",
      hint: stats.largest?.description,
    },
    {
      icon: <CalendarClock className="w-4 h-4" strokeWidth={2} />,
      label: t("insights.txStats.costliestDay"),
      value: stats.costliestDay ? formatCurrency(stats.costliestDay.spend) : "—",
      hint: stats.costliestDay ? t("insights.txStats.day", { day: stats.costliestDay.day }) : undefined,
    },
  ];

  return (
    <div className="bg-card rounded-2xl p-[18px_18px_16px] shadow-bento">
      <div className="flex items-center justify-between mb-[14px]">
        <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
          {t("insights.txStats.title")}
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-[9px] bg-muted/60 text-muted-foreground shrink-0">
              {row.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-muted-foreground">{row.label}</div>
              {row.hint && (
                <div className="text-[12px] text-muted-foreground/80 truncate">{row.hint}</div>
              )}
            </div>
            <div className="text-[15px] font-semibold tabular-nums text-foreground whitespace-nowrap">
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
