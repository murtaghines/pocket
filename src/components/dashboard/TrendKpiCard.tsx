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
  label: string;
  icon: ReactNode;
  bgClass: string;
  /** When true: filled brand-blue card (used for Net Balance) */
  filled?: boolean;
  transactions: Array<{ date: string; amount: number; type: string }>;
  monthKey: string | null;
  total: number;
  previousTotal?: number;
  convert: (amount: number) => number;
  formatCurrency: (n: number) => string;
  positiveIsGood?: boolean;
  delay?: number;
}

export function TrendKpiCard({
  kind,
  label,
  icon,
  bgClass,
  filled = false,
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

  // ── Filled variant (Net Balance card): brand-blue background, all white text
  // ── Default variant: white card, dark value text, colored icon badge + delta
  const accentVar =
    kind === "income" ? "--success" : kind === "expense" ? "--destructive" : "--primary";
  const accent = `hsl(var(${accentVar}))`;

  const cardClasses = filled
    ? "bg-primary border-primary/0 shadow-[0_12px_26px_-12px_rgba(20,80,210,0.6)]"
    : "bg-card border border-border/60";

  const labelClass = filled ? "text-white/78" : "text-muted-foreground";
  const iconBgClass = filled ? "bg-white/18" : (
    kind === "income" ? "bg-success/10" : kind === "expense" ? "bg-destructive/10" : "bg-primary/10"
  );
  const iconColorClass = filled ? "text-white" : (
    kind === "income" ? "text-success" : kind === "expense" ? "text-destructive" : "text-primary"
  );
  const valueClass = filled ? "text-white" : "text-foreground";
  const chipClass = filled
    ? "bg-white/18 text-white"
    : kind === "income" ? "bg-success/10 text-success"
    : kind === "expense" ? "bg-destructive/10 text-destructive"
    : "bg-primary/10 text-primary";
  const chipMutedClass = filled ? "text-white/60" : "text-muted-foreground";
  const hoverTextClass = filled ? "text-white/60" : "text-muted-foreground";

  const chartStroke = filled ? "rgba(255,255,255,0.7)" : accent;
  const chartGradColor = filled ? "#fff" : accent;
  const chartGradStartOp = filled ? 0.25 : 0.35;
  const cursorStroke = chartStroke;
  const dotFill = chartStroke;
  const dotStroke = chartStroke;

  const tintOverlayClass = filled ? "" :
    kind === "income" ? "bg-success/5" : kind === "expense" ? "bg-destructive/5" : "";

  return (
    <Card
      variant="bento"
      className={`overflow-hidden ${cardClasses} h-[200px] flex flex-col relative`}
    >
      {tintOverlayClass && (
        <div className={`absolute inset-0 pointer-events-none ${tintOverlayClass}`} />
      )}
      <div className="p-4 md:p-5 relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <p className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>
            {label}
          </p>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBgClass} ${iconColorClass}`}>
            {icon}
          </div>
        </div>

        {/* Big value */}
        <p className={`text-2xl md:text-3xl font-bold tabular-nums tracking-tight ${valueClass}`}>
          {formatCurrency(total)}
        </p>

        {/* Comparison vs last month */}
        {change !== undefined && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${chipClass}`}>
              {isUp && <ArrowUp className="w-3 h-3" />}
              {isDown && <ArrowDown className="w-3 h-3" />}
              <span>{Math.abs(change)}%</span>
            </div>
            <span className={`text-xs ${chipMutedClass}`}>
              {t("stats.vsLastMonth")}
            </span>
          </div>
        )}

        {/* Hover info line (reserved space, no layout shift) */}
        <p className={`text-[11px] mt-1 h-3.5 ${hoverTextClass}`}>
          {hoverPoint
            ? `${formatHoverDate(hoverPoint.date)}: ${formatCurrency(hoverPoint.daily)}`
            : ""}
        </p>
      </div>

      {/* Trend chart — curve sits higher, gradient extends to card bottom */}
      <div className="absolute left-0 right-0 bottom-0 h-14 pointer-events-auto">
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
