import { useTranslation } from "react-i18next";

interface SavingsRateRingCardProps {
  income: number;
  expenses: number;
}

/**
 * Savings rate shown as a mini donut with the percentage in the centre — the saved amount
 * is intentionally omitted since it's already the Net Balance right next to it.
 *
 * The ring is a fixed-size inline SVG (not a Recharts ResponsiveContainer) because the
 * responsive container measures its flex parent's height, which collapses on mobile and left the
 * ring invisible with the percentage overlapping the label. A fixed SVG renders deterministically.
 */
export function SavingsRateRingCard({ income, expenses }: SavingsRateRingCardProps) {
  const { t } = useTranslation("dashboard");

  const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const filled = Math.max(0, Math.min(100, rate));

  const size = 72;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (filled / 100) * circumference;

  return (
    <div className="flex h-full items-center gap-2.5 rounded-xl bg-card p-[14px_16px] shadow-bento border border-border">
      {/* Label stacked in two lines so the ring gets the rest of the width */}
      <span className="max-w-[60px] shrink-0 text-[12px] font-semibold uppercase leading-[1.18] tracking-[.04em] text-muted-foreground">
        {t("stats.savingsRate")}
      </span>
      <div
        className="relative ml-auto flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <span className="absolute text-[17px] md:text-[20px] font-semibold tabular-nums leading-none text-foreground">
          {rate}%
        </span>
      </div>
    </div>
  );
}
