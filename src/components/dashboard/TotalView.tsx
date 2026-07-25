import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { TrendingUp, TrendingDown, Wallet, Scale, PiggyBank, Percent, Award, Flame, LineChart as LineChartIcon } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ReferenceLine, Cell, LineChart, Line,
} from "recharts";
import { MonthlyChart } from "./MonthlyChart";
import { YearlyBalanceChart } from "./YearlyBalanceChart";
import { RollingCashflowChart } from "./RollingCashflowChart";
import { CategoryTrendChart } from "./CategoryTrendChart";
import { SeasonalityCard } from "./SeasonalityCard";
import { WeekdaySpendingCard } from "./WeekdaySpendingCard";
import { formatPeriodLabel, type Granularity } from "@/lib/analytics";
import type { HistoricalInsights } from "@/hooks/useHistoricalInsights";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

interface TotalViewProps {
  monthlyData: MonthlyData[];
  /** Optional advanced insights (rolling/seasonality/weekday/category trends + enriched KPIs). */
  insights?: HistoricalInsights;
  /** Bucketing level the whole view is showing (drives labels + which cards appear). */
  granularity: Granularity;
}

export function TotalView({ monthlyData, insights, granularity }: TotalViewProps) {
  const { t, i18n } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();

  // Short per-period unit ("wk" / "mo" / "yr") for average suffixes.
  const unit = t(`granularity.unit.${granularity}`, { defaultValue: { week: 'wk', month: 'mo', year: 'yr' }[granularity] });
  // "N weeks/months/years tracked".
  const trackedLabel = t(`views.periodsTracked.${granularity}`, {
    count: monthlyData.length,
    defaultValue: { week: '{{count}} weeks tracked', month: '{{count}} months tracked', year: '{{count}} years tracked' }[granularity],
  });
  // Singular period noun ("week" / "month" / "year") for best/worst titles.
  const periodNoun = t(`granularity.noun.${granularity}`, { defaultValue: { week: 'week', month: 'month', year: 'year' }[granularity] });
  const bestPeriodLabel = t('views.bestPeriod', { period: periodNoun, defaultValue: 'Best {{period}}' });
  const worstPeriodLabel = t('views.worstPeriod', { period: periodNoun, defaultValue: 'Worst {{period}}' });

  const hasData = monthlyData.length > 0 && monthlyData.some(d => d.income !== 0 || d.expenses !== 0);

  const totalIncome = monthlyData.reduce((s, d) => s + d.income, 0);
  const totalExpenses = monthlyData.reduce((s, d) => s + d.expenses, 0);
  const totalBalance = monthlyData.reduce((s, d) => s + d.balance, 0);
  const avgBalance = monthlyData.length > 0 ? Math.round(totalBalance / monthlyData.length) : 0;
  const avgIncome = monthlyData.length > 0 ? Math.round(totalIncome / monthlyData.length) : 0;
  const avgExpenses = monthlyData.length > 0 ? Math.round(totalExpenses / monthlyData.length) : 0;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  // Cumulative balance
  let cumulative = 0;
  const cumulativeData = monthlyData.map(d => {
    cumulative += d.balance;
    return { ...d, cumulative };
  });

  // Savings rate evolution per month
  const savingsRateData = monthlyData.map(d => ({
    month: d.month,
    rate: d.income > 0 ? Math.round(((d.income - d.expenses) / d.income) * 100) : 0,
  }));

  const formatMonthLabel = (val: string) => formatPeriodLabel(val, granularity, i18n.language);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-1">{formatMonthLabel(label)}</p>
          {payload.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-medium text-foreground">
                {item.dataKey === 'rate' ? `${item.value}%` : formatCurrency(item.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <div className="space-y-6">
        <Card variant="bento">
          <CardContent className="py-12">
            <EmptyState height="h-[200px]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period summary line */}
      <p className="text-sm text-muted-foreground -mt-2">
        {trackedLabel}
      </p>

      {/* Aggregate KPIs — same inverted look as the Dashboard TrendKpiCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Income */}
        <Card variant="bento" className="bg-success/5 h-[128px] flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-success/80">
                {t('views.totalIncome', 'Total Income')}
              </p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-success/10 text-success">
                <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-[20px] font-semibold tracking-tight tabular-nums text-success">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-success/60 mt-auto">
              ø {formatCurrency(avgIncome)}/{unit}
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card variant="bento" className="bg-destructive/5 h-[128px] flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-destructive/80">
                {t('views.totalExpenses', 'Total Expenses')}
              </p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-destructive/10 text-destructive">
                <TrendingDown className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-[20px] font-semibold tracking-tight tabular-nums text-destructive">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-xs text-destructive/60 mt-auto">
              ø {formatCurrency(avgExpenses)}/{unit}
            </p>
          </CardContent>
        </Card>

        {/* Total saved */}
        <Card variant="bento" className="bg-card h-[128px] flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-primary/70">
                {t('views.totalSaved', 'Total Saved')}
              </p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                <PiggyBank className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-[20px] font-semibold tracking-tight tabular-nums text-primary">
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-primary/60 mt-auto">
              ø {formatCurrency(avgBalance)}/{unit}
            </p>
          </CardContent>
        </Card>

        {/* Savings rate */}
        <Card variant="bento" className="bg-card h-[128px] flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-primary/70">
                {t('views.savingsRate', 'Savings Rate')}
              </p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                <Percent className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-[20px] font-semibold tracking-tight tabular-nums text-primary">
              {savingsRate}%
            </p>
            <p className="text-xs text-primary/60 mt-auto">
              {t('views.overallAverage', 'overall average')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enriched behaviour KPIs: best/worst month, savings streak, income stability */}
      {insights && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="bento" className="h-[128px] flex flex-col">
            <CardContent className="p-4 md:p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-success" strokeWidth={2.2} />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {bestPeriodLabel}
                </p>
              </div>
              {insights.summary.bestMonth ? (
                <>
                  <p className="text-lg font-semibold tabular-nums text-foreground mt-auto">
                    {formatCurrency(insights.summary.bestMonth.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {formatPeriodLabel(insights.summary.bestMonth.month, granularity, i18n.language)}
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-muted-foreground mt-auto">—</p>
              )}
            </CardContent>
          </Card>

          <Card variant="bento" className="h-[128px] flex flex-col">
            <CardContent className="p-4 md:p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-destructive" strokeWidth={2.2} />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {worstPeriodLabel}
                </p>
              </div>
              {insights.summary.worstMonth ? (
                <>
                  <p className="text-lg font-semibold tabular-nums text-foreground mt-auto">
                    {formatCurrency(insights.summary.worstMonth.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {formatPeriodLabel(insights.summary.worstMonth.month, granularity, i18n.language)}
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-muted-foreground mt-auto">—</p>
              )}
            </CardContent>
          </Card>

          <Card variant="bento" className="h-[128px] flex flex-col">
            <CardContent className="p-4 md:p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-warning" strokeWidth={2.2} />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("insights.summary.positiveStreak")}
                </p>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground mt-auto">
                {insights.summary.positiveStreak}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(`insights.summary.streakPeriods.${granularity}`, {
                  count: insights.summary.positiveStreak,
                  defaultValue: { week: 'positive weeks', month: 'positive months', year: 'positive years' }[granularity],
                })}
              </p>
            </CardContent>
          </Card>

          <Card variant="bento" className="h-[128px] flex flex-col">
            <CardContent className="p-4 md:p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1">
                <LineChartIcon className="w-4 h-4 text-primary" strokeWidth={2.2} />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("insights.summary.incomeStability")}
                </p>
              </div>
              <p className="text-lg font-semibold text-foreground mt-auto">
                {insights.summary.incomeVolatility < 0.2
                  ? t("insights.summary.stable")
                  : t("insights.summary.variable")}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                CV {Math.round(insights.summary.incomeVolatility * 100)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rolling net cash flow (smoothed trend) — its 30d/90d/180d windows and month axis are
          calendar-month bound, so it only makes sense at month granularity. */}
      {insights && granularity === "month" && <RollingCashflowChart rolling={insights.rolling} />}

      {/* Cumulative Balance Evolution */}
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              {t('views.cumulativeBalance', 'Cumulative Balance')}
            </CardTitle>
            <p className="text-xl font-semibold text-success">{formatCurrency(cumulative)}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatMonthLabel} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="cumulative" name={t('views.accumulated', 'Accumulated')} stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#cumulativeGrad)" dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Income vs expenses per period (moved from monthly view) */}
      <MonthlyChart data={monthlyData} granularity={granularity} />

      {/* Income vs Expenses Trend */}
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            {t('views.incomeVsExpenses', 'Income vs Expenses Trend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatMonthLabel} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="income" name={t('stats.income')} fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name={t('stats.expenses')} fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">{t('stats.income')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-sm text-muted-foreground">{t('stats.expenses')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Balance — its axis labels + title are calendar-month bound, so it's only shown at
          month granularity (redundant at year, mislabeled at week). */}
      {granularity === "month" && <YearlyBalanceChart data={monthlyData} />}

      {/* Monthly Net Balance */}
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              {t('views.netBalance', 'Net Balance')}
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('charts.average', 'Avg')}: {formatCurrency(avgBalance)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barCategoryGap="20%">
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={formatMonthLabel} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={avgBalance} stroke="hsl(var(--muted-foreground) / 0.3)" strokeDasharray="3 3" />
                <Bar dataKey="balance" name={t('stats.balance')} radius={[6, 6, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.balance >= avgBalance
                        ? 'hsl(var(--success))'
                        : entry.balance > 0
                          ? 'hsl(var(--success) / 0.4)'
                          : 'hsl(var(--destructive))'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Savings Rate Evolution (NEW) */}
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Percent className="w-4 h-4 text-primary" />
              </div>
              {t('views.savingsRateEvolution', 'Savings Rate Evolution')}
            </CardTitle>
            <p className="text-sm font-semibold text-foreground">{savingsRate}% avg</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savingsRateData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={formatMonthLabel} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={45} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={savingsRate} stroke="hsl(var(--muted-foreground) / 0.3)" strokeDasharray="3 3" label={{ value: `${savingsRate}%`, position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Line type="monotone" dataKey="rate" name={t('views.savingsRate', 'Savings Rate')} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category spending trends over time */}
      {insights && <CategoryTrendChart trend={insights.categoryTrend} granularity={granularity} />}

      {/* Seasonality (calendar-month only) + weekday spending pattern (day-of-week; hidden at year). */}
      {insights && granularity !== "year" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {granularity === "month" && (
            <SeasonalityCard seasonal={insights.seasonal} hasData={insights.hasSeasonalData} />
          )}
          <WeekdaySpendingCard weekday={insights.weekday} />
        </div>
      )}
    </div>
  );
}
