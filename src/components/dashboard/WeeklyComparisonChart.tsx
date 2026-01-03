import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Calendar } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";

interface WeeklyData {
  day: string;
  amount: number;
  isToday?: boolean;
}

export function WeeklyComparisonChart() {
  const { t, formatCurrency, language } = useLocalization();

  // Day abbreviations based on language
  const getDayAbbreviations = () => {
    switch (language) {
      case 'en':
        return ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      case 'pt':
        return ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
      case 'fr':
        return ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      case 'it':
        return ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
      case 'de':
        return ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
      default:
        return ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    }
  };

  const dayAbbrevs = getDayAbbreviations();

  const weeklyData: WeeklyData[] = [
    { day: dayAbbrevs[0], amount: 45 },
    { day: dayAbbrevs[1], amount: 120 },
    { day: dayAbbrevs[2], amount: 35 },
    { day: dayAbbrevs[3], amount: 89, isToday: true },
    { day: dayAbbrevs[4], amount: 0 },
    { day: dayAbbrevs[5], amount: 0 },
    { day: dayAbbrevs[6], amount: 0 },
  ];

  const totalSpent = weeklyData.reduce((sum, d) => sum + d.amount, 0);
  const averageDaily = Math.round(totalSpent / weeklyData.filter(d => d.amount > 0).length || 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          <p className="text-xs font-medium">{label}</p>
          <p className="text-sm font-semibold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="animate-slide-up flex-1" style={{ animationDelay: '600ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {t('dashboard.this_week')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold">{formatCurrency(totalSpent)}</span>
          <span className="text-xs text-muted-foreground">{t('dashboard.spent')}</span>
        </div>
        
        <div className="h-[80px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barCategoryGap="20%">
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar 
                dataKey="amount" 
                radius={[3, 3, 0, 0]}
              >
                {weeklyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isToday 
                      ? 'hsl(155, 60%, 45%)' 
                      : entry.amount > 0 
                        ? 'hsl(var(--muted-foreground) / 0.3)' 
                        : 'hsl(var(--muted))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 pt-2 border-t flex justify-between text-xs">
          <span className="text-muted-foreground">{t('dashboard.daily_average')}</span>
          <span className="font-medium">{formatCurrency(averageDaily)}{t('dashboard.per_day')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
