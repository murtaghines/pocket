import { useTranslation } from "react-i18next";

interface SavingsRateRingProps {
  income: number;
  expenses: number;
}

export function SavingsRateRing({ income, expenses }: SavingsRateRingProps) {
  const { t } = useTranslation("dashboard");

  const MIN_INCOME_THRESHOLD = 1;
  const hasMeaningfulIncome = income >= MIN_INCOME_THRESHOLD;
  const rate = hasMeaningfulIncome
    ? Math.round(((income - expenses) / income) * 100)
    : null;

  const isNegative = rate !== null && rate < 0;
  const filled = rate !== null ? Math.min(100, Math.abs(rate)) : 0;

  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const dash = (filled / 100) * circumference;

  const strokeColor = isNegative
    ? "hsl(var(--destructive))"
    : "hsl(var(--primary))";

  const ariaLabel =
    rate !== null
      ? t("stats.savingsRateAria", { rate, defaultValue: "Savings rate {{rate}}%" })
      : t("stats.savingsRate");

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      title={t("stats.savingsRate")}
      className="relative w-[66px] h-[66px] shrink-0"
    >
      <svg
        width="66"
        height="66"
        viewBox="0 0 66 66"
        aria-hidden="true"
      >
        <circle
          cx="33"
          cy="33"
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={6}
        />
        {filled > 0 && (
          <circle
            cx="33"
            cy="33"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 33 33)"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-semibold text-[14px] text-foreground tabular-nums">
        {rate !== null ? `${rate}%` : "—"}
      </span>
    </div>
  );
}
