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
  income: "bg-[#2E9E6B]",
  expense: "bg-[#E0704A]",
  balance: "bg-[#0C0D0E]",
  invest: "bg-primary",
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
    if (!key) return "last month";
    const [y, m] = key.split("-").map(Number);
    const d = previousMonthKey ? new Date(y, m - 1, 1) : new Date(y, m - 2, 1);
    return new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(d);
  }, [monthKey, previousMonthKey, previousPeriodLabel, i18n.language]);

  const deltaColor =
    change === undefined
      ? "text-[#9AA1AC]"
      : isGoodChange
      ? "text-[#2E9E6B]"
      : kind === "invest"
      ? "text-primary"
      : "text-[#D9542B]";

  const valueColor = kind === "balance" && total < 0 ? "text-[#D9542B]" : "text-[#0C0D0E]";

  return (
    <div
      className={cn("flex h-full flex-col rounded-xl bg-card p-[16px_18px] shadow-section", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-[6px] mb-[14px]">
        <span className={cn("w-[7px] h-[7px] rounded-full shrink-0", DOT_COLORS[kind])} />
        <span className="text-[13px] font-medium text-[#6B7280]">
          {label}
        </span>
      </div>

      <div className="mt-auto">
        <div
          className={cn(
            "text-[22px] font-semibold tracking-[-0.025em] tabular-nums leading-none",
            valueColor,
          )}
        >
          {formatCurrency(total)}
        </div>
        <div className="text-[12.5px] text-[#9AA1AC] mt-[5px]">
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
