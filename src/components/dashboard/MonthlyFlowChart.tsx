import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import type { DailyTotal } from "@/hooks/usePeriodAggregates";

interface MonthlyFlowChartProps {
  dailyTotals: DailyTotal[];
  yearKey: string | null;
  convert: (amount: number) => number;
}

const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyFlowChart({ dailyTotals, yearKey, convert }: MonthlyFlowChartProps) {
  const { t, i18n } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const { points, netChange } = useMemo(() => {
    if (!yearKey) return { points: [], netChange: 0 };

    const monthlyNet: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) monthlyNet[m] = 0;

    for (const d of dailyTotals) {
      const m = Number(d.day.slice(5, 7));
      if (m >= 1 && m <= 12) {
        monthlyNet[m] += convert(d.income) - convert(d.expenses);
      }
    }

    let cumulative = 0;
    const pts = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      cumulative += monthlyNet[m];
      const label = new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(
        new Date(2024, m - 1, 1),
      );
      return { month: m, label, balance: Math.round(cumulative * 100) / 100 };
    });

    return { points: pts, netChange: cumulative };
  }, [dailyTotals, yearKey, convert, i18n.language]);

  const hasData = points.some((p) => p.balance !== 0);
  const isPositive = netChange >= 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { label, balance } = payload[0].payload;
    return (
      <div className="bg-card rounded-xl shadow-lg p-3 min-w-[150px]">
        <p className="text-xs text-[#9AA1AC] mb-1">{label}</p>
        <p
          className="text-sm font-semibold"
          style={{ color: balance >= 0 ? "#1B76FF" : "hsl(var(--destructive))" }}
        >
          {balance >= 0 ? "+" : ""}
          {formatCurrency(balance)}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl p-[20px_22px_16px] shadow-section">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[15px] font-heading font-bold text-foreground">
            {t("charts.monthlyFlowTitle", "Monthly balance")}
          </p>
          <p className="text-[12.5px] text-[#9AA1AC] mt-0.5">
            {t("charts.monthlyFlowSubtitle", "Cumulative net balance through {{year}}", {
              year: yearKey ?? "",
            })}
          </p>
        </div>
        {hasData && (
          <span
            className="text-[13px] font-semibold whitespace-nowrap tabular-nums"
            style={{ color: isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))" }}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(netChange)}
          </span>
        )}
      </div>

      {!hasData ? (
        <EmptyState height="h-[160px]" />
      ) : (
        <div className="h-[180px] md:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="monthlyBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1B76FF" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#1B76FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F2F4" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9AA1AC", fontSize: 11 }}
                interval={0}
                dy={8}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "#1B76FF", strokeWidth: 1, strokeDasharray: "4 2" }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#1B76FF"
                strokeWidth={2.2}
                fill="url(#monthlyBalanceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#1B76FF", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
