import { useMemo, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type TrendKind = "income" | "expense" | "balance" | "invest";

interface TrendKpiCardProps {
  kind: TrendKind;
  label: string;
  icon: ReactNode;
  bgClass: string;
  /** When true: filled brand-blue card (Net Balance) */
  filled?: boolean;
  transactions?: Array<{ date: string; amount: number; type: string }>;
  monthKey: string | null;
  previousMonthKey?: string | null;
  /** Override the "vs X" label — needed when monthKey isn't a YYYY-MM month (e.g. week/year tabs). */
  previousPeriodLabel?: string;
  total: number;
  previousTotal?: number;
  convert?: (amount: number) => number;
  formatCurrency: (n: number) => string;
  positiveIsGood?: boolean;
  delay?: number;
  className?: string;
}

export function TrendKpiCard({
  kind,
  label,
  icon,
  filled = false,
  monthKey,
  previousMonthKey,
  previousPeriodLabel,
  total,
  previousTotal,
  formatCurrency,
  positiveIsGood = true,
  delay = 0,
  className,
}: TrendKpiCardProps) {
  const { i18n } = useTranslation("dashboard");

  const change =
    previousTotal !== undefined && previousTotal !== 0
      ? Math.round(((total - previousTotal) / Math.abs(previousTotal)) * 100)
      : undefined;

  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  const isGoodChange = positiveIsGood ? isUp : isDown;

  const prevMonthLabel = useMemo(() => {
    if (previousPeriodLabel !== undefined) return previousPeriodLabel;
    const key = previousMonthKey || monthKey;
    if (!key) return "last month";
    const [y, m] = key.split("-").map(Number);
    const d = previousMonthKey ? new Date(y, m - 1, 1) : new Date(y, m - 2, 1);
    return new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(d);
  }, [monthKey, previousMonthKey, previousPeriodLabel, i18n.language]);

  // Styling per variant. Borderless — elevation is the shadow token, not a gray outline.
  const cardClasses = filled
    ? "bg-primary text-primary-foreground"
    : "bg-card";

  const labelClass = filled ? "text-primary-foreground/78" : "text-muted-foreground";
  const valueClass = filled ? "text-primary-foreground" : "text-foreground";
  const subtextClass = filled ? "text-primary-foreground/82" : "text-muted-foreground";

  const iconBgClass = filled
    ? "bg-white/[0.18] text-primary-foreground"
    : kind === "income"
    ? "bg-success/10 text-success"
    : kind === "expense"
    ? "bg-destructive/10 text-destructive"
    : kind === "invest"
    ? "bg-primary/10 text-primary"
    : "bg-primary/10 text-primary";

  const deltaColor =
    change === undefined
      ? subtextClass
      : isGoodChange
      ? "text-success"
      : filled
      ? "text-primary-foreground/82"
      : "text-destructive";

  const cardShadow = filled
    ? "var(--shadow-glow)"
    : "var(--shadow-bento)";

  return (
    <div
      className={cn("flex h-full flex-col rounded-xl p-[16px] transition-all", cardClasses, className)}
      style={{ boxShadow: cardShadow, animationDelay: `${delay}ms` }}
    >
      {/* Header row: label + icon badge */}
      <div className="flex items-center justify-between mb-[10px]">
        <span className={cn("text-[12px] font-semibold uppercase tracking-[.04em]", labelClass)}>
          {label}
        </span>
        <div
          className={cn(
            "flex items-center justify-center w-[30px] h-[30px] rounded-[9px] shrink-0",
            iconBgClass,
          )}
        >
          {icon}
        </div>
      </div>

      {/* Value + delta, anchored to the bottom so cards line up across the row */}
      <div className="mt-auto">
        <div
          className={cn(
            "text-[17px] md:text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-none",
            valueClass,
          )}
        >
          {formatCurrency(total)}
        </div>
        <div className={cn("text-[12px] mt-[5px]", subtextClass)}>
          {change !== undefined ? (
            <>
              <span className={cn("font-semibold", deltaColor)}>
                {isUp ? "▲" : isDown ? "▼" : "–"}{" "}
                {Math.abs(change)}%
              </span>{" "}
              vs {prevMonthLabel}
            </>
          ) : (
            <span className="opacity-70">–</span>
          )}
        </div>
      </div>
    </div>
  );
}
