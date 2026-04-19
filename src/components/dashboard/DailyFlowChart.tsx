import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { Activity } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface DailyFlowChartProps {
  transactions: Array<{ date: string; amount: number; type: string }>;
  monthKey: string | null;
  convert: (amount: number) => number;
}

interface WeekPoint {
  weekIndex: number;
  label: string;
  rangeLabel: string;
  income: number;
  expense: number;
}

export function DailyFlowChart({ transactions, monthKey, convert }: DailyFlowChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const data: WeekPoint[] = useMemo(() => {
    if (!monthKey) return [];
    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    // Build 1 bucket per ISO-style week of the month (groups of 7 days starting day 1)
    const bucketCount = Math.ceil(daysInMonth / 7);
    const buckets: WeekPoint[] = Array.from({ length: bucketCount }, (_, i) => {
      const startDay = i * 7 + 1;
      const endDay = Math.min(startDay + 6, daysInMonth);
      return {
        weekIndex: i + 1,
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
  }, [transactions, monthKey, convert]);

  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  const incomeLabel = t("stats.income", "Income");
  const expenseLabel = t("stats.expenses", "Expenses");

  if (!hasData) {
    return (
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: "150ms" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {t("charts.weeklyFlow", "Weekly Flow")}
          </CardTitle>
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
        <p className="text-xs text-muted-foreground mb-2">{point?.rangeLabel}</p>
        <div className="flex items-center justify-between gap-3 text-sm">
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
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">
            {t("charts.weeklyFlow", "Weekly Flow")}
          </CardTitle>
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-success" /> {incomeLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" /> {expenseLabel}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
            >
              <defs>
                <linearGradient id="dailyflow-income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dailyflow-expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                  return `${v}`;
                }}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "hsl(var(--muted-foreground))",
                  strokeOpacity: 0.4,
                  strokeDasharray: "3 3",
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                name={incomeLabel}
                stroke="hsl(var(--success))"
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="url(#dailyflow-income)"
                fillOpacity={1}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--success))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="expense"
                name={expenseLabel}
                stroke="hsl(var(--destructive))"
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="url(#dailyflow-expense)"
                fillOpacity={1}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--destructive))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
