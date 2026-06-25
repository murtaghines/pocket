import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { TrendingUp, TrendingDown, Wallet, Scale, PiggyBank, Percent } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ReferenceLine, Cell, LineChart, Line,
} from "recharts";
import { MonthlyChart } from "./MonthlyChart";
import { YearlyBalanceChart } from "./YearlyBalanceChart";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

interface TotalViewProps {
  monthlyData: MonthlyData[];
}

export function TotalView({ monthlyData }: TotalViewProps) {
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();

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

  const formatMonthLabel = (val: string) => {
    const [, m] = val.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[parseInt(m) - 1] || val;
  };

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
        {t('views.monthsTracked', { count: monthlyData.length, defaultValue: '{{count}} months tracked' })}
      </p>

      {/* Aggregate KPIs — same inverted look as the Dashboard TrendKpiCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income */}
        <Card variant="bento" className="bg-success/5 border border-success/20 h-[160px] flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-success/80">
                {t('views.totalIncome', 'Total Income')}
              </p>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-success/10 text-success">
                <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-success to-success/60 bg-clip-text text-transparent">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-success/60 mt-auto">
              ø {formatCurrency(avgIncome)}/{t('views.month', 'mo')}
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card variant="bento" className="bg-destructive/5 border border-destructive/20 h-[160px] flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-destructive/80">
                {t('views.totalExpenses', 'Total Expenses')}
              </p>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/10 text-destructive">
                <TrendingDown className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-destructive to-destructive/60 bg-clip-text text-transparent">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-xs text-destructive/60 mt-auto">
              ø {formatCurrency(avgExpenses)}/{t('views.month', 'mo')}
            </p>
          </CardContent>
        </Card>

        {/* Total saved */}
        <Card variant="bento" className="bg-card border border-primary/20 h-[160px] flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-primary/70">
                {t('views.totalSaved', 'Total Saved')}
              </p>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                <PiggyBank className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-primary/60 mt-auto">
              ø {formatCurrency(avgBalance)}/{t('views.month', 'mo')}
            </p>
          </CardContent>
        </Card>

        {/* Savings rate */}
        <Card variant="bento" className="bg-card border border-primary/20 h-[160px] flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-primary/70">
                {t('views.savingsRate', 'Savings Rate')}
              </p>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                <Percent className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {savingsRate}%
            </p>
            <p className="text-xs text-primary/60 mt-auto">
              {t('views.overallAverage', 'overall average')}
            </p>
          </CardContent>
        </Card>
      </div>

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
            <p className="text-xl font-bold text-success">{formatCurrency(cumulative)}</p>
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

      {/* Monthly Balance (moved from monthly view) */}
      <MonthlyChart data={monthlyData} />

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

      {/* Yearly Balance (moved from monthly view) */}
      <YearlyBalanceChart data={monthlyData} />

      {/* Monthly Net Balance */}
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              {t('views.monthlyNet', 'Monthly Net Balance')}
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
    </div>
  );
}
