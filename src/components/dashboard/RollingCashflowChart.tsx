import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { ROLLING_WINDOWS, type RollingWindow } from "@/hooks/useHistoricalInsights";
import type { RollingPoint } from "@/lib/analytics";

interface RollingCashflowChartProps {
  rolling: Record<RollingWindow, RollingPoint[]>;
}

// Window (in months) -> approximate day label shown on the toggle.
const WINDOW_LABEL: Record<RollingWindow, string> = { 1: "30d", 3: "90d", 6: "180d" };

/**
 * Monthly net cash flow (bars) with a rolling-average line over a selectable window (~30/90/180
 * days). The rolling line smooths short-term seasonal noise so the underlying trend is visible.
 */
export function RollingCashflowChart({ rolling }: RollingCashflowChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency, formatMonthShort } = useLocalization();
  const [window, setWindow] = useState<RollingWindow>(3);

  const data = rolling[window] ?? [];
  const hasData = data.some((d) => d.net !== 0);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3">
        <p className="text-xs font-semibold text-foreground mb-1">
          {label ? formatMonthShort(`${label}-01`) : ""}
        </p>
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-medium text-foreground tabular-nums">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card variant="bento">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            {t("insights.rolling.title")}
          </CardTitle>
          <div className="flex items-center gap-1 rounded-full bg-muted/60 p-0.5">
            {ROLLING_WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindow(w)}
                className={`text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
                  window === w
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {WINDOW_LABEL[w]}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("insights.rolling.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState height="h-[260px]" />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v) => formatMonthShort(`${v}-01`)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar
                  dataKey="net"
                  name={t("insights.rolling.net")}
                  fill="hsl(var(--primary) / 0.18)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="rolling"
                  name={t("insights.rolling.rolling")}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
