import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SavingsRateRingCardProps {
  income: number;
  expenses: number;
}

/**
 * Savings rate shown as a mini donut with the percentage in the centre — the saved amount
 * is intentionally omitted since it's already the Net Balance right next to it.
 */
export function SavingsRateRingCard({ income, expenses }: SavingsRateRingCardProps) {
  const { t } = useTranslation("dashboard");

  const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const filled = Math.max(0, Math.min(100, rate));
  const data = [{ value: filled }, { value: 100 - filled }];

  return (
    <div className="flex h-full items-center gap-2.5 rounded-2xl bg-card p-[14px_16px] shadow-bento">
      {/* Label stacked in two lines so the ring gets the rest of the width */}
      <span className="max-w-[60px] shrink-0 text-[12px] font-semibold uppercase leading-[1.18] tracking-[.04em] text-muted-foreground">
        {t("stats.savingsRate")}
      </span>
      <div className="relative ml-auto flex h-full min-h-[78px] flex-1 items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill="hsl(var(--primary))" />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-[21px] font-semibold tabular-nums leading-none text-foreground">{rate}%</span>
        </div>
      </div>
    </div>
  );
}
