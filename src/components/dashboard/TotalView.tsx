import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { TrendingUp, TrendingDown, Wallet, Scale, PiggyBank, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ReferenceLine, Cell, LineChart, Line,
} from "recharts";

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
  const { formatCurrency, formatMonth } = useLocalization();

  const hasData = monthlyData.length > 0 && monthlyData.some(d => d.income !== 0 || d.expenses !== 0);

  // Aggregate KPIs
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
              <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
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
    <div className="space-y-6 animate-fade-in">
      {/* Period summary */}
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t('views.historicalOverview', 'Historical Overview')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('views.monthsTracked', { count: monthlyData.length, defaultValue: '{{count}} months tracked' })}
        </p>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="bento" className="animate-slide-up">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <span className="text-xs text-muted-foreground">{t('views.totalIncome', 'Total Income')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ø {formatCurrency(avgIncome)}/{t('views.month', 'mo')}
            </p>
          </CardContent>
        </Card>

        <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '50ms' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-xs text-muted-foreground">{t('views.totalExpenses', 'Total Expenses')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ø {formatCurrency(avgExpenses)}/{t('views.month', 'mo')}
            </p>
          </CardContent>
        </Card>

        <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <PiggyBank className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">{t('views.totalSaved', 'Total Saved')}</span>
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(totalBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ø {formatCurrency(avgBalance)}/{t('views.month', 'mo')}
            </p>
          </CardContent>
        </Card>

        <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '150ms' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-accent/50 flex items-center justify-center">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">{t('views.savingsRate', 'Savings Rate')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{savingsRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('views.overallAverage', 'overall average')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Balance Evolution */}
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '200ms' }}>
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

      {/* Income vs Expenses Trend */}
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '300ms' }}>
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
                <Bar dataKey="income" name={t('stats.income')} fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name={t('stats.expenses')} fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} />
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

      {/* Monthly Balance (Net) */}
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '400ms' }}>
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
    </div>
  );
}
