import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/hooks/useLocalization";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface CategoryChartProps {
  data: CategoryData[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  interface LegendEntry {
    color: string;
    value: string;
    payload?: { value: number };
  }

  const CustomLegend = ({ payload, total }: { payload?: LegendEntry[]; total: number }) => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {payload?.map((entry: LegendEntry, index: number) => {
          const value = entry.payload?.value || 0;
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground truncate">{entry.value}</span>
              <span className="text-xs text-muted-foreground/70 ml-auto">{percentage}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  const hasData = data.length > 0 && total > 0;

  if (!hasData) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">{t('charts.categoryBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('common:noDataYet')}</p>
      </CardContent>
    </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">{t('charts.categoryBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="40%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
