import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DailyPoint {
  day: number;
  date: string; // YYYY-MM-DD
  amount: number; // cumulative expense up to this day
  daily: number; // expense on this day only
}

interface ExpenseTrendCardProps {
  /** All transactions (we filter by month here) */
  transactions: Array<{ date: string; amount: number; type: string }>;
  /** YYYY-MM */
  monthKey: string | null;
  /** Total month expense (already converted to user currency) */
  totalExpense: number;
  /** Previous month total expense (for comparison) */
  previousExpense?: number;
  /** Currency conversion (raw EUR -> user currency) */
  convert: (amount: number) => number;
  formatCurrency: (n: number) => string;
  delay?: number;
}

export function ExpenseTrendCard({
  transactions,
  monthKey,
  totalExpense,
  previousExpense,
  convert,
  formatCurrency,
  delay = 0,
}: ExpenseTrendCardProps) {
  const { t, i18n } = useTranslation("dashboard");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const daily: DailyPoint[] = useMemo(() => {
    if (!monthKey) return [];
    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    const perDay = new Map<number, number>();
    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      if (!tx.date.startsWith(monthKey)) return;
      const d = parseInt(tx.date.slice(8, 10), 10);
      if (!d) return;
      const amt = Math.abs(convert(tx.amount));
      perDay.set(d, (perDay.get(d) || 0) + amt);
    });

    const points: DailyPoint[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayAmt = perDay.get(d) || 0;
      points.push({
        day: d,
        date: `${monthKey}-${String(d).padStart(2, "0")}`,
        amount: dayAmt,
        daily: dayAmt,
      });
    }
    return points;
  }, [transactions, monthKey, convert]);

  const hoverPoint =
    hoverIdx !== null && hoverIdx >= 0 && hoverIdx < daily.length
      ? daily[hoverIdx]
      : null;

  const formatHoverDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    try {
      return new Intl.DateTimeFormat(i18n.language || "en", {
        day: "2-digit",
        month: "2-digit",
      }).format(dt);
    } catch {
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
    }
  };

  return (
    <Card
      variant="bento"
      className="animate-slide-up overflow-hidden border-0 bg-destructive text-white h-[280px] flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5 md:p-6 relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-white/80">
            {t("stats.expenses")}
          </p>
          <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Minus className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Big value (always month total, static) + hover info */}
        <div className="mb-3">
          <p className="text-3xl md:text-4xl font-bold tracking-tight font-display text-white">
            {formatCurrency(totalExpense)}
          </p>
          <p className="text-xs text-white/80 mt-2 h-4">
            {hoverPoint
              ? `${formatHoverDate(hoverPoint.date)}: ${formatCurrency(hoverPoint.daily)}`
              : ""}
          </p>
        </div>

        {/* Trend chart fills remaining space */}
        <div className="flex-1 -mx-2 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={daily}
              margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              onMouseMove={(e: any) => {
                if (e && typeof e.activeTooltipIndex === "number") {
                  setHoverIdx(e.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="expense-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[0, "dataMax"]} />
              <Tooltip
                cursor={{
                  stroke: "#ffffff",
                  strokeWidth: 1,
                  strokeOpacity: 0.5,
                  strokeDasharray: "3 3",
                }}
                content={() => null}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#ffffff"
                strokeWidth={2}
                fill="url(#expense-trend-fill)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#ffffff",
                  stroke: "hsl(var(--destructive))",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
