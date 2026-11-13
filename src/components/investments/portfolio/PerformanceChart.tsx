import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Camera, TrendingUp, TrendingDown } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { usePortfolioPerformance } from "@/hooks/usePortfolioPerformance";

const PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "ALL"] as const;
type Period = (typeof PERIODS)[number];

function PerformanceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card rounded-lg shadow-popup p-3 min-w-[170px]">
      <p className="text-xs text-muted-foreground mb-1">{d.date}</p>
      <div className="flex justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {d._labelValue}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {d._fmtValue}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {d._labelCost}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {d._fmtCost}
        </span>
      </div>
      {d.pnl !== 0 && (
        <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">P&L</span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              d.pnl > 0
                ? "text-success"
                : d.pnl < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {d.pnl > 0 ? "+" : ""}
            {d._fmtPnl}
          </span>
        </div>
      )}
    </div>
  );
}

export function PerformanceChart() {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();
  const [period, setPeriod] = useState<Period>("1Y");
  const { performance, isLoading, takeSnapshot } = usePortfolioPerformance(period);

  const hasSeries = performance.series.length > 0;
  const isPositive = performance.totalReturn > 0;
  const isZero = performance.totalReturn === 0;

  const chartData = performance.series.map((pt: any) => ({
    ...pt,
    _labelValue: t("portfolio.totalValue"),
    _labelCost: t("portfolio.costBasis"),
    _fmtValue: formatCurrency(pt.totalValue),
    _fmtCost: formatCurrency(pt.totalCostBasis),
    _fmtPnl: formatCurrency(pt.pnl),
  }));

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap px-6 pt-5 pb-3 shrink-0">
        <div>
          <h3 className="text-base font-semibold">{t("performance.title")}</h3>
          <div className="flex items-center gap-2 mt-1">
            {!isZero && (isPositive ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            ))}
            <span
              className={`text-sm font-semibold tabular-nums ${
                isZero
                  ? "text-muted-foreground"
                  : isPositive
                    ? "text-success"
                    : "text-destructive"
              }`}
            >
              {isPositive ? "+" : ""}
              {performance.totalReturnPercent.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({isPositive ? "+" : ""}
              {formatCurrency(performance.totalReturn)})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => takeSnapshot.mutate()}
            disabled={takeSnapshot.isPending}
            title={t("performance.takeSnapshot")}
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="px-6 pb-5 flex-1 min-h-0 flex flex-col">
        {!hasSeries ? (
          <div className="flex items-center justify-center h-[220px]">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t("performance.noData")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => takeSnapshot.mutate()}
                disabled={takeSnapshot.isPending}
                className="gap-1.5"
              >
                <Camera className="w-4 h-4" />
                {t("performance.takeSnapshot")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 6, right: 4, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="perfValueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.16}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="perfCostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--muted-foreground))"
                      stopOpacity={0.08}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--muted-foreground))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  dy={8}
                />
                <YAxis
                  hide
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={<PerformanceTooltip />}
                  cursor={{
                    stroke: "hsl(var(--primary))",
                    strokeWidth: 1,
                    strokeDasharray: "4 2",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalCostBasis"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="url(#perfCostGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.2}
                  fill="url(#perfValueGrad)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "hsl(var(--primary))",
                    strokeWidth: 0,
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {hasSeries && performance.periodDays >= 365 && (
          <div className="flex items-center justify-center mt-3 pt-3 border-t border-border shrink-0">
            <span className="text-xs text-muted-foreground">
              {t("performance.annualized")}:{" "}
              <span
                className={`font-semibold tabular-nums ${
                  performance.annualizedReturn > 0
                    ? "text-success"
                    : performance.annualizedReturn < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {performance.annualizedReturn > 0 ? "+" : ""}
                {performance.annualizedReturn.toFixed(1)}%
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
