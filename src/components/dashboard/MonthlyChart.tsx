import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalization } from "@/hooks/useLocalization";
import { BarChart3 } from "lucide-react";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

interface MonthlyChartProps {
  data: MonthlyData[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();

  const hasData = data.length > 0 && data.some(d => d.income !== 0 || d.expenses !== 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border/50 rounded-xl shadow-lg p-4">
          <p className="font-semibold text-foreground mb-2">{(() => { const [,m] = (label || '').split('-'); const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return names[parseInt(m)-1] || label; })()}</p>
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(item.value)}
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
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {t('charts.monthlyBalance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '300ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {t('charts.monthlyBalance')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="area" className="w-full">
          <TabsList className="mb-4 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="area" className="rounded-lg text-xs">Area</TabsTrigger>
            <TabsTrigger value="bar" className="rounded-lg text-xs">Bar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="area">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGradientModern" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expenseGradientModern" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(val) => { const [,m] = val.split('-'); const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return names[parseInt(m)-1] || val; }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    name={t('stats.income')}
                    stroke="hsl(160, 84%, 39%)" 
                    strokeWidth={2}
                    fill="url(#incomeGradientModern)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    name={t('stats.expenses')}
                    stroke="hsl(0, 72%, 51%)" 
                    strokeWidth={2}
                    fill="url(#expenseGradientModern)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="bar">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={4}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(val) => { const [,m] = val.split('-'); const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return names[parseInt(m)-1] || val; }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="income" 
                    name={t('stats.income')}
                    fill="hsl(160, 84%, 39%)" 
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar 
                    dataKey="expenses" 
                    name={t('stats.expenses')}
                    fill="hsl(0, 72%, 51%)" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Legend */}
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
