import { useTranslation } from "react-i18next";

interface SavingsRateRingCardProps {
  income: number;
  expenses: number;
}

export function SavingsRateRingCard({ income, expenses }: SavingsRateRingCardProps) {
  const { t } = useTranslation("dashboard");

  const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const filled = Math.max(0, Math.min(100, Math.abs(rate)));
  const isNegative = rate < 0;

  const size = 52;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (filled / 100) * circumference;

  const ringColor = isNegative ? "#E0704A" : "hsl(var(--primary))";

  return (
    <div className="flex h-full flex-col rounded-xl bg-card p-[16px_18px] shadow-section">
      <div className="flex items-center gap-[6px] mb-[14px]">
        <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-primary" />
        <span className="text-[13px] font-medium text-[#6B7280]">
          {t("stats.savingsRate")}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <div>
          <div className="text-[22px] font-semibold tracking-[-0.025em] tabular-nums leading-none text-[#0C0D0E]">
            {rate}%
          </div>
        </div>
        <div
          className="relative flex shrink-0 items-center justify-center"
          style={{ width: size, height: size }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1F2F4" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
