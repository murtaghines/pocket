import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";
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
    <div className="flex flex-col rounded-2xl bg-card p-[18px] shadow-bento">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
          {t("stats.savingsRate")}
        </span>
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-primary/10 text-primary">
          <PiggyBank className="h-[17px] w-[17px]" strokeWidth={2.2} />
        </div>
      </div>
      <div className="relative flex min-h-[104px] flex-1 items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="72%"
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
          <span className="text-[22px] font-semibold tabular-nums leading-none text-foreground">{rate}%</span>
        </div>
      </div>
    </div>
  );
}
