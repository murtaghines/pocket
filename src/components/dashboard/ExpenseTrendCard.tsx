import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Minus, ArrowUp, ArrowDown } from "lucide-react";
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
  amount: number; // raw daily expense
  daily: number; // expense on this day only (real value)
  display: number; // compressed value for chart rendering
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

    const rawPoints = [];
    let maxAmt = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayAmt = perDay.get(d) || 0;
      if (dayAmt > maxAmt) maxAmt = dayAmt;
      rawPoints.push({ day: d, dayAmt });
    }

    // Compress values with sqrt so small days remain visible vs spikes,
    // and add a small floor so zero-days share an identical baseline.
    const sqrtMax = Math.sqrt(maxAmt);
    const floor = sqrtMax > 0 ? sqrtMax * 0.08 : 1;
    const points: DailyPoint[] = rawPoints.map(({ day, dayAmt }) => ({
      day,
      date: `${monthKey}-${String(day).padStart(2, "0")}`,
      amount: dayAmt,
      daily: dayAmt,
      display: Math.sqrt(dayAmt) + floor,
    }));
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

  const change =
    previousExpense && previousExpense > 0
      ? Math.round(((totalExpense - previousExpense) / previousExpense) * 100)
      : undefined;
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;

  return (
    <Card
      variant="bento"
      className="animate-slide-up overflow-hidden border-0 bg-destructive text-white h-[260px] flex flex-col relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="px-5 md:px-6 pt-5 md:pt-6 relative flex flex-col h-full z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-white/80">
            {t("stats.expenses")}
          </p>
          <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Minus className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Big value (always month total, static) */}
        <p className="text-3xl md:text-4xl font-bold tracking-tight font-display text-white">
          {formatCurrency(totalExpense)}
        </p>

        {/* Comparison vs last month */}
        {change !== undefined && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-0.5 px-2.5 py-1 rounded-full text-sm font-semibold bg-white/20 text-white">
              {isUp && <ArrowUp className="w-3.5 h-3.5" />}
              {isDown && <ArrowDown className="w-3.5 h-3.5" />}
              <span>{Math.abs(change)}%</span>
            </div>
            <span className="text-sm text-white/70">
              {t("stats.vsLastMonth")}
            </span>
          </div>
        )}

        {/* Hover info line (reserved space, no layout shift) */}
        <p className="text-xs text-white/80 mt-2 h-4">
          {hoverPoint
            ? `${formatHoverDate(hoverPoint.date)}: ${formatCurrency(hoverPoint.daily)}`
            : ""}
        </p>

        {/* Spacer to reserve room for the chart */}
        <div className="mt-auto h-16" />
      </div>

      {/* Trend chart — extends to the bottom edge of the card */}
      <div className="absolute inset-x-0 bottom-0 h-20 z-0 pointer-events-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={daily}
            margin={{ top: 6, right: 0, bottom: 0, left: 0 }}
            onMouseMove={(e: any) => {
              if (e && typeof e.activeTooltipIndex === "number") {
                setHoverIdx(e.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="expense-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0.18} />
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
              dataKey="display"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
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
    </Card>
  );
}
