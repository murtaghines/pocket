import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface SavingsRateRingCardProps {
  income: number;
  expenses: number;
  previousIncome?: number;
  previousExpenses?: number;
  previousPeriodLabel?: string;
  monthKey: string | null;
}

export function SavingsRateRingCard({
  income,
  expenses,
  previousIncome,
  previousExpenses,
  previousPeriodLabel,
  monthKey,
}: SavingsRateRingCardProps) {
  const { t, i18n } = useTranslation("dashboard");

  const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const previousRate =
    previousIncome !== undefined && previousExpenses !== undefined && previousIncome > 0
      ? Math.round(((previousIncome - previousExpenses) / previousIncome) * 100)
      : undefined;

  const change = previousRate !== undefined ? rate - previousRate : undefined;

  const filled = Math.max(0, Math.min(100, Math.abs(rate)));

  const size = 58;
  const stroke = 7;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const dash = (filled / 100) * circumference;

  const prevLabel = useMemo(() => {
    if (previousPeriodLabel) return previousPeriodLabel;
    if (!monthKey) return "";
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return new Intl.DateTimeFormat(i18n.language || "en", { month: "long" }).format(d).toLowerCase();
  }, [monthKey, previousPeriodLabel, i18n.language]);

  return (
    <div className="flex h-full items-center gap-[14px] rounded-xl bg-[#CBE0FF] p-[16px_18px] shadow-section">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#1B75FF] mb-[14px]">
          {t("stats.savingsRate")}
        </div>
        <div className="text-[22px] font-semibold tracking-[-0.025em] tabular-nums leading-none text-[#1B75FF]">
          {rate}%
        </div>
        <div className="text-[12.5px] text-[#9AA1AC] mt-[5px]">
          {change !== undefined ? (
            <>
              <span className="font-medium text-[#1B75FF]">{change > 0 ? "+" : ""}{change}%</span>{" "}
              <span className="text-[#1B75FF]">vs {prevLabel}</span>
            </>
          ) : (
            <span className="opacity-70">–</span>
          )}
        </div>
      </div>
      <svg width="74" height="66" viewBox="0 0 58 58" className="shrink-0">
        <circle cx="29" cy="29" r={radius} fill="none" stroke="#1B75FF" strokeWidth={stroke} />
        <circle
          cx="29"
          cy="29"
          r={radius}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 29 29)"
        />
      </svg>
    </div>
  );
}
