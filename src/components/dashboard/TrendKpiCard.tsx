import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type TrendKind = "income" | "expense" | "balance" | "invest";

interface TrendKpiCardProps {
  kind: TrendKind;
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  transactions?: Array<{ date: string; amount: number; type: string }>;
  monthKey: string | null;
  previousMonthKey?: string | null;
  previousPeriodLabel?: string;
  total: number;
  previousTotal?: number;
  convert?: (amount: number) => number;
  formatCurrency: (n: number) => string;
  positiveIsGood?: boolean;
  delay?: number;
  className?: string;
}

const DOT_COLORS: Record<TrendKind, string> = {
  income: "bg-success",
  expense: "bg-destructive",
  balance: "bg-white",
  invest: "bg-primary",
};

const LABEL_COLORS: Record<TrendKind, string> = {
  income: "text-success",
  expense: "text-destructive",
  balance: "text-white",
  invest: "text-primary",
};

export function TrendKpiCard({
  kind,
  label,
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
    if (!key || !key.includes("-")) return "last month";
    const [y, m] = key.split("-").map(Number);
    if (isNaN(y) || isNaN(m)) return "last month";
    const d = previousMonthKey ? new Date(y, m - 1, 1) : new Date(y, m - 2, 1);
    return new Intl.DateTimeFormat(i18n.language || "en", { month: "long" }).format(d).toLowerCase();
  }, [monthKey, previousMonthKey, previousPeriodLabel, i18n.language]);

  const isBalance = kind === "balance";

  const deltaColor = isBalance
    ? "text-white"
    : change === undefined
    ? "text-muted-foreground"
    : isGoodChange
    ? "text-success"
    : kind === "invest"
    ? "text-primary"
    : "text-destructive";

  const valueColor = isBalance ? "text-white" : "text-foreground";

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl p-[14px_14px] md:p-[16px_18px] shadow-section",
        isBalance ? "bg-primary/90" : "bg-card",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-[6px] mb-[14px]">
        <span className={cn("w-[7px] h-[7px] rounded-full shrink-0", DOT_COLORS[kind])} />
        <span className={cn("text-[13px] font-medium", LABEL_COLORS[kind])}>
          {label}
        </span>
      </div>

      <div className="mt-auto">
        <div
          className={cn(
            "text-[18px] md:text-[22px] font-semibold tracking-[-0.025em] tabular-nums leading-none",
            valueColor,
          )}
        >
          {formatCurrency(total)}
        </div>
        <div className={cn("text-[12.5px] mt-[5px]", isBalance ? "text-white/70" : "text-muted-foreground")}>
          {change !== undefined ? (
            <>
              <span className={cn("font-medium", deltaColor)}>
                {isUp ? "+" : isDown ? "" : ""}{change}%
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
