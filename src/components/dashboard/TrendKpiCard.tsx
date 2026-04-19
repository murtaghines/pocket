import { useMemo, useState, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
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
  date: string;
  daily: number;
  display: number;
}

export type TrendKind = "income" | "expense" | "balance";

interface TrendKpiCardProps {
  kind: TrendKind;
  /** Label (e.g. "Income", "Expenses", "Balance") */
  label: string;
  /** Icon shown in the top-right circle (already styled in white) */
  icon: ReactNode;
  /** Background color CSS (Tailwind bg-*) */
  bgClass: string;
  /** All transactions for the period */
  transactions: Array<{ date: string; amount: number; type: string }>;
  /** YYYY-MM */
  monthKey: string | null;
  /** Total month value already converted (signed for balance) */
  total: number;
  /** Previous month total (for comparison) */
  previousTotal?: number;
  /** Currency conversion (raw EUR -> user currency) */
  convert: (amount: number) => number;
  formatCurrency: (n: number) => string;
  /** Higher is better (income, balance) vs lower is better (expense) */
  positiveIsGood?: boolean;
  delay?: number;
}

export function TrendKpiCard({
  kind,
  label,
  icon,
  bgClass,
  transactions,
  monthKey,
  total,
  previousTotal,
  convert,
  formatCurrency,
  positiveIsGood = true,
  delay = 0,
}: TrendKpiCardProps) {
  const { t, i18n } = useTranslation("dashboard");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const daily: DailyPoint[] = useMemo(() => {
    if (!monthKey) return [];
    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    const perDay = new Map<number, number>();
    transactions.forEach((tx) => {
      if (!tx.date.startsWith(monthKey)) return;
      const d = parseInt(tx.date.slice(8, 10), 10);
      if (!d) return;
      const amt = convert(tx.amount);
      let contribution = 0;
      if (kind === "income" && tx.type === "income") contribution = Math.abs(amt);
      else if (kind === "expense" && tx.type === "expense") contribution = Math.abs(amt);
      else if (kind === "balance") {
        if (tx.type === "income") contribution = Math.abs(amt);
        else if (tx.type === "expense") contribution = -Math.abs(amt);
      }
      if (contribution !== 0) {
        perDay.set(d, (perDay.get(d) || 0) + contribution);
      }
    });

    const rawPoints = [];
    let maxAbs = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayAmt = perDay.get(d) || 0;
      if (Math.abs(dayAmt) > maxAbs) maxAbs = Math.abs(dayAmt);
      rawPoints.push({ day: d, dayAmt });
    }

    // Compress with sqrt + floor so small/zero days remain visible.
    // For balance (signed), preserve sign on the display value.
    const floor = maxAbs > 0 ? Math.sqrt(maxAbs) * 0.08 : 1;
    const points: DailyPoint[] = rawPoints.map(({ day, dayAmt }) => {
      const sign = dayAmt < 0 ? -1 : 1;
      const compressed = Math.sqrt(Math.abs(dayAmt)) + floor;
      return {
        day,
        date: `${monthKey}-${String(day).padStart(2, "0")}`,
        daily: dayAmt,
        display: kind === "balance" ? sign * compressed : compressed,
      };
    });
    return points;
  }, [transactions, monthKey, convert, kind]);

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
    previousTotal !== undefined && previousTotal !== 0
      ? Math.round(((total - previousTotal) / Math.abs(previousTotal)) * 100)
      : undefined;
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;

  const gradientId = `trend-fill-${kind}`;
  const isBalance = kind === "balance";

  // Balance card uses inverted styling: white bg + blue accents
  const cardClasses = isBalance
    ? "bg-card border border-primary/20"
    : `border-0 ${bgClass} text-white`;

  const labelClass = isBalance ? "text-primary/70" : "text-white/80";
  const iconBgClass = isBalance ? "bg-primary/10" : "bg-white/15 backdrop-blur-sm";
  const iconColorClass = isBalance ? "text-primary" : "";
  const valueClass = isBalance
    ? "bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
    : "text-white";
  const chipClass = isBalance ? "bg-primary/10 text-primary" : "bg-white/20 text-white";
  const chipMutedClass = isBalance ? "text-primary/60" : "text-white/70";
  const hoverTextClass = isBalance ? "text-primary/70" : "text-white/80";

  // Chart colors
  const chartStroke = isBalance ? "hsl(var(--primary))" : "#ffffff";
  const chartGradColor = isBalance ? "hsl(var(--primary))" : "#ffffff";
  const chartGradStartOp = isBalance ? 0.35 : 0.5;
  const cursorStroke = isBalance ? "hsl(var(--primary))" : "#ffffff";
  const dotFill = isBalance ? "hsl(var(--primary))" : "#ffffff";
  const dotStroke = isBalance ? "hsl(var(--primary))" : "#000000";

  return (
    <Card
      variant="bento"
      className={`animate-slide-up overflow-hidden ${cardClasses} h-[260px] flex flex-col relative`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5 md:p-6 relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>
            {label}
          </p>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass} ${iconColorClass}`}>
            {icon}
          </div>
        </div>

        {/* Big value */}
        <p className={`text-3xl md:text-4xl font-bold tracking-tight font-display ${valueClass}`}>
          {formatCurrency(total)}
        </p>

        {/* Comparison vs last month */}
        {change !== undefined && (
          <div className="flex items-center gap-2 mt-2">
            <div className={`flex items-center gap-0.5 px-2.5 py-1 rounded-full text-sm font-semibold ${chipClass}`}>
              {isUp && <ArrowUp className="w-3.5 h-3.5" />}
              {isDown && <ArrowDown className="w-3.5 h-3.5" />}
              <span>{Math.abs(change)}%</span>
            </div>
            <span className={`text-sm ${chipMutedClass}`}>
              {t("stats.vsLastMonth")}
            </span>
          </div>
        )}

        {/* Hover info line (reserved space, no layout shift) */}
        <p className={`text-xs mt-2 h-4 ${hoverTextClass}`}>
          {hoverPoint
            ? `${formatHoverDate(hoverPoint.date)}: ${formatCurrency(hoverPoint.daily)}`
            : ""}
        </p>
      </div>

      {/* Trend chart — curve sits higher, gradient extends to card bottom */}
      <div className="absolute left-0 right-0 bottom-0 h-20 pointer-events-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={daily}
            margin={{ top: 8, right: 2, bottom: 16, left: 2 }}
            onMouseMove={(e: any) => {
              if (e && typeof e.activeTooltipIndex === "number") {
                setHoverIdx(e.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartGradColor} stopOpacity={chartGradStartOp} />
                <stop offset="100%" stopColor={chartGradColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <YAxis hide domain={kind === "balance" ? ["dataMin", "dataMax"] : [0, "dataMax"]} />
            <Tooltip
              cursor={{
                stroke: cursorStroke,
                strokeWidth: 1,
                strokeOpacity: 0.5,
                strokeDasharray: "3 3",
              }}
              content={() => null}
            />
            <Area
              type="natural"
              dataKey="display"
              stroke={chartStroke}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              dot={false}
              activeDot={{
                r: 4,
                fill: dotFill,
                stroke: dotStroke,
                strokeOpacity: 0.15,
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
