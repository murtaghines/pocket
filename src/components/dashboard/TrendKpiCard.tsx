import { useMemo, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type TrendKind = "income" | "expense" | "balance";

interface TrendKpiCardProps {
  kind: TrendKind;
  label: string;
  icon: ReactNode;
  bgClass: string;
  /** When true: filled brand-blue card (Net Balance) */
  filled?: boolean;
  transactions?: Array<{ date: string; amount: number; type: string }>;
  monthKey: string | null;
  total: number;
  previousTotal?: number;
  convert?: (amount: number) => number;
  formatCurrency: (n: number) => string;
  positiveIsGood?: boolean;
  delay?: number;
}

export function TrendKpiCard({
  kind,
  label,
  icon,
  filled = false,
  monthKey,
  total,
  previousTotal,
  formatCurrency,
  positiveIsGood = true,
  delay = 0,
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
    if (!monthKey) return "last month";
    const [y, m] = monthKey.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    return new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(prevDate);
  }, [monthKey, i18n.language]);

  // Styling per variant
  const cardClasses = filled
    ? "bg-primary text-white"
    : "bg-card border border-[rgba(13,30,70,.07)]";

  const labelClass = filled ? "text-white/78" : "text-[#79839a]";
  const valueClass = filled ? "text-white" : "text-[#0d1220]";
  const subtextClass = filled ? "text-white/82" : "text-[#79839a]";

  const iconBgClass = filled
    ? "bg-white/[0.18] text-white"
    : kind === "income"
    ? "bg-[hsl(152_60%_94%)] text-[hsl(152_64%_36%)]"
    : kind === "expense"
    ? "bg-[hsl(8_80%_95%)] text-[hsl(8_72%_52%)]"
    : "bg-[hsl(216_100%_95%)] text-[hsl(216_100%_50%)]";

  const deltaColor =
    change === undefined
      ? subtextClass
      : isGoodChange
      ? "text-[hsl(152_64%_36%)]"
      : filled
      ? "text-white/82"
      : "text-[hsl(8_72%_52%)]";

  const cardShadow = filled
    ? "0 12px 26px -12px rgba(20,80,210,.6)"
    : "0 1px 3px rgba(13,30,70,.06)";

  return (
    <div
      className={cn("rounded-[18px] p-[18px_18px_16px] transition-all", cardClasses)}
      style={{ boxShadow: cardShadow, animationDelay: `${delay}ms` }}
    >
      {/* Header row: label + icon badge */}
      <div className="flex items-center justify-between mb-[14px]">
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

      {/* Big value */}
      <div
        className={cn(
          "text-[25px] font-bold tracking-[-0.02em] tabular-nums leading-none",
          valueClass,
        )}
      >
        {formatCurrency(total)}
      </div>

      {/* Delta line */}
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
  );
}
