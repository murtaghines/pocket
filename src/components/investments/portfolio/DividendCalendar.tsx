import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Coins, Calendar, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/hooks/useLocalization";
import { useDividendCalendar, type DividendByHolding } from "@/hooks/useDividendCalendar";

const PREVIEW_LIMIT = 5;

export function DividendCalendar() {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();
  const { data, isLoading, hasDividends } = useDividendCalendar();
  const [showAllHoldings, setShowAllHoldings] = useState(false);

  if (isLoading || !hasDividends) return null;

  const monthlyAvg =
    data.byMonth.length > 0 ? data.totalAllTime / data.byMonth.length : 0;
  const projectedAnnual = data.trailing12m;
  const yieldLabel =
    data.byHolding.reduce((s, h) => s + h.holding_value, 0) > 0
      ? (
          (data.trailing12m /
            data.byHolding.reduce((s, h) => s + h.holding_value, 0)) *
          100
        ).toFixed(2)
      : null;

  const chartData = data.byMonth.slice(-12).map((m) => ({
    month: m.month.slice(5),
    amount: m.amount,
    payments: m.payment_count,
  }));

  const visibleHoldings = showAllHoldings
    ? data.byHolding
    : data.byHolding.slice(0, PREVIEW_LIMIT);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card rounded-xl shadow-lg p-3 min-w-[140px]">
        <p className="text-xs text-muted-foreground mb-1">{d.month}</p>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            {t("dividends.total")}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(d.amount)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            {t("dividends.payments")}
          </span>
          <span className="text-sm font-semibold tabular-nums">{d.payments}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="px-6 pt-5 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[9px] bg-[hsl(var(--dividend))]/10 text-[hsl(var(--dividend))]">
            <Coins className="w-[15px] h-[15px]" />
          </div>
          <h3 className="text-base font-semibold">
            {t("dividends.title")}
          </h3>
        </div>
      </div>
      <div className="px-6 pb-5 flex-1 min-h-0 overflow-y-auto space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiMini
            label={t("dividends.totalReceived")}
            value={formatCurrency(data.totalAllTime)}
            sub={`${data.totalPayments} ${t("dividends.payments")}`}
            icon={<Coins className="w-3.5 h-3.5" />}
            color="text-[hsl(var(--dividend))]"
          />
          <KpiMini
            label={t("dividends.monthlyAvg")}
            value={formatCurrency(monthlyAvg)}
            icon={<Calendar className="w-3.5 h-3.5" />}
            color="text-primary"
          />
          <KpiMini
            label={t("dividends.projected")}
            value={formatCurrency(projectedAnnual)}
            sub={t("dividends.trailing12m")}
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            color="text-success"
          />
          {yieldLabel && (
            <KpiMini
              label={t("dividends.yield")}
              value={`${yieldLabel}%`}
              sub={t("dividends.annualized")}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              color="text-success"
            />
          )}
        </div>

        {/* Monthly bar chart */}
        {chartData.length > 1 && (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="amount"
                  fill="hsl(var(--dividend))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per-holding breakdown */}
        {data.byHolding.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-[13px] font-medium text-muted-foreground">
              {t("dividends.byHolding")}
            </h4>
            <div className="space-y-1">
              {visibleHoldings.map((h, i) => (
                <HoldingDividendRow
                  key={h.ticker || i}
                  holding={h}
                  maxTotal={data.byHolding[0]?.total || 1}
                />
              ))}
            </div>
            {data.byHolding.length > PREVIEW_LIMIT && (
              <button
                onClick={() => setShowAllHoldings(!showAllHoldings)}
                className="flex items-center gap-1 text-[12px] text-primary font-medium mx-auto mt-2"
              >
                {showAllHoldings ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    {t("dividends.showLess")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    {t("dividends.showAll", { count: data.byHolding.length })}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Quarterly summary */}
        {data.byQuarter.length > 1 && (
          <div className="space-y-1">
            <h4 className="text-[13px] font-medium text-muted-foreground">
              {t("dividends.byQuarter")}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.byQuarter.slice(-8).map((q) => (
                <div key={q.quarter} className="rounded-xl bg-muted p-2.5">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {q.quarter}
                  </div>
                  <div className="text-sm font-bold tabular-nums text-foreground mt-0.5">
                    {formatCurrency(q.amount)}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {q.payment_count} {t("dividends.payments")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiMini({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <div className={cn("flex items-center gap-1.5 mb-1", color)}>
        {icon}
        <span className="text-[13px] font-medium">
          {label}
        </span>
      </div>
      <div className={cn("text-[17px] font-bold tabular-nums leading-none", color)}>
        {value}
      </div>
      {sub && (
        <p className="text-[10px] mt-1 text-muted-foreground tabular-nums">{sub}</p>
      )}
    </div>
  );
}

function HoldingDividendRow({
  holding,
  maxTotal,
}: {
  holding: DividendByHolding;
  maxTotal: number;
}) {
  const { formatCurrency } = useLocalization();
  const { t } = useTranslation("investments");
  const barPct = maxTotal > 0 ? (holding.total / maxTotal) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {holding.ticker || holding.asset_name}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {holding.payment_count} {t("dividends.payments")}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-border mt-1 overflow-hidden">
          <div
            className="h-full rounded-full bg-[hsl(var(--dividend))]"
            style={{ width: `${Math.max(barPct, 2)}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
        {formatCurrency(holding.total)}
      </span>
    </div>
  );
}
