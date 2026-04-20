import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DailyFlowChartProps {
  transactions: Array<{ date: string; amount: number; type: string }>;
  monthKey: string | null;
  convert: (amount: number) => number;
}

interface FlowPoint {
  key: string;
  label: string;
  rangeLabel: string;
  income: number;
  expense: number;
}

type ViewMode = "week" | "weekday";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function DailyFlowChart({ transactions, monthKey, convert }: DailyFlowChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const [view, setView] = useState<ViewMode>("week");
  const [scale, setScale] = useState<"linear" | "log">("log");

  const data: FlowPoint[] = useMemo(() => {
    if (!monthKey) return [];
    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    if (view === "week") {
      const bucketCount = Math.ceil(daysInMonth / 7);
      const buckets: FlowPoint[] = Array.from({ length: bucketCount }, (_, i) => {
        const startDay = i * 7 + 1;
        const endDay = Math.min(startDay + 6, daysInMonth);
        return {
          key: `W${i + 1}`,
          label: `W${i + 1}`,
          rangeLabel: `${String(startDay).padStart(2, "0")}–${String(endDay).padStart(2, "0")}/${String(m).padStart(2, "0")}`,
          income: 0,
          expense: 0,
        };
      });

      transactions.forEach((tx) => {
        if (!tx.date.startsWith(monthKey)) return;
        const d = parseInt(tx.date.slice(8, 10), 10);
        if (!d) return;
        const idx = Math.min(Math.floor((d - 1) / 7), bucketCount - 1);
        const amt = Math.abs(convert(tx.amount));
        if (tx.type === "income") buckets[idx].income += amt;
        else if (tx.type === "expense") buckets[idx].expense += amt;
      });

      return buckets;
    }

    // Weekday view: Mon..Sun aggregating all matching weekdays of the month
    const weekdayBuckets: FlowPoint[] = WEEKDAY_KEYS.map((k) => ({
      key: k,
      label: t(`weekdays.${k}`, {
        defaultValue: k.charAt(0).toUpperCase() + k.slice(1),
      }),
      rangeLabel: t(`weekdays.full.${k}`, {
        defaultValue: k.charAt(0).toUpperCase() + k.slice(1),
      }),
      income: 0,
      expense: 0,
    }));

    transactions.forEach((tx) => {
      if (!tx.date.startsWith(monthKey)) return;
      const [yy, mm, dd] = tx.date.split("-").map(Number);
      if (!yy || !mm || !dd) return;
      // JS getDay: 0=Sun..6=Sat. Convert to Mon=0..Sun=6
      const jsDay = new Date(yy, mm - 1, dd).getDay();
      const idx = (jsDay + 6) % 7;
      const amt = Math.abs(convert(tx.amount));
      if (tx.type === "income") weekdayBuckets[idx].income += amt;
      else if (tx.type === "expense") weekdayBuckets[idx].expense += amt;
    });

    return weekdayBuckets;
  }, [transactions, monthKey, convert, view, t]);

  const hasData = data.some((d) => d.income > 0 || d.expense > 0);
  const incomeLabel = t("stats.income", "Income");
  const expenseLabel = t("stats.expenses", "Expenses");

  // For log scale, recharts can't handle 0/negative. Compute a sensible min and
  // remap zeros to it so bars render small but visible without distorting reads.
  const allValues = data.flatMap((d) => [d.income, d.expense]).filter((v) => v > 0);
  const minPositive = allValues.length ? Math.min(...allValues) : 1;
  const logMin = Math.max(1, Math.floor(minPositive / 2));
  const maxValue = allValues.length ? Math.max(...allValues) : 1;

  const chartData =
    scale === "log"
      ? data.map((d) => ({
          ...d,
          income: d.income > 0 ? d.income : logMin,
          expense: d.expense > 0 ? d.expense : logMin,
        }))
      : data;

  const titleText =
    view === "week"
      ? t("charts.weeklyFlow", "Weekly Flow")
      : t("charts.weekdayFlow", "Weekday Flow");

  const ToggleButtons = (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setScale("linear")}
          className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            scale === "linear"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={t("charts.scaleLinearTooltip", { defaultValue: "Linear scale" })}
        >
          {t("charts.scaleLinear", { defaultValue: "Linear" })}
        </button>
        <button
          type="button"
          onClick={() => setScale("log")}
          className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            scale === "log"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={t("charts.scaleLogTooltip", { defaultValue: "Logarithmic scale — better for large value differences" })}
        >
          {t("charts.scaleLog", { defaultValue: "Log" })}
        </button>
      </div>
      <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setView("week")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            view === "week"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("charts.toggleWeek", { defaultValue: "Week" })}
        </button>
        <button
          type="button"
          onClick={() => setView("weekday")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            view === "weekday"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("charts.toggleWeekday", { defaultValue: "Weekday" })}
        </button>
      </div>
    </div>
  );

  if (!hasData) {
    return (
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: "150ms" }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold">{titleText}</CardTitle>
            {ToggleButtons}
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[260px]" />
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const incomeVal = payload.find((p: any) => p.dataKey === "income")?.value ?? 0;
    const expenseVal = payload.find((p: any) => p.dataKey === "expense")?.value ?? 0;
    const point = data.find((d) => d.label === label);
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3 min-w-[180px]">
        <p className="text-xs font-medium text-foreground">{point?.label}</p>
        {point?.rangeLabel && point.rangeLabel !== point.label && (
          <p className="text-xs text-muted-foreground mb-2">{point.rangeLabel}</p>
        )}
        <div className="flex items-center justify-between gap-3 text-sm mt-1">
          <span className="flex items-center gap-1.5 text-foreground">
            <span className="w-2 h-2 rounded-full bg-success" /> {incomeLabel}
          </span>
          <span className="font-semibold text-success">{formatCurrency(incomeVal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm mt-1">
          <span className="flex items-center gap-1.5 text-foreground">
            <span className="w-2 h-2 rounded-full bg-destructive" /> {expenseLabel}
          </span>
          <span className="font-semibold text-destructive">{formatCurrency(expenseVal)}</span>
        </div>
      </div>
    );
  };

  return (
    <Card variant="bento" className="animate-slide-up" style={{ animationDelay: "150ms" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg font-semibold">{titleText}</CardTitle>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success" /> {incomeLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" /> {expenseLabel}
              </span>
            </div>
            {ToggleButtons}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
              barCategoryGap="20%"
              barGap={4}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
                  return `${Math.round(v)}`;
                }}
                width={44}
                scale={scale === "log" ? "log" : "auto"}
                domain={
                  scale === "log" ? [logMin, Math.ceil(maxValue * 1.2)] : [0, "auto"]
                }
                allowDataOverflow={scale === "log"}
                ticks={
                  scale === "log"
                    ? Array.from(
                        { length: Math.ceil(Math.log10(maxValue / logMin)) + 1 },
                        (_, i) => logMin * Math.pow(10, i),
                      )
                    : undefined
                }
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
              />
              <Bar
                dataKey="income"
                name={incomeLabel}
                fill="hsl(var(--success))"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expense"
                name={expenseLabel}
                fill="hsl(var(--destructive))"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
