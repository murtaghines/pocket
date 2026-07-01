import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface SpendingByCategoryChartProps {
  data: CategoryData[];
}

export function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const hasData = data.length > 0 && total > 0;

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const maxValue = sorted.length > 0 ? sorted[0].value : 1;

  if (!hasData) {
    return (
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {t('charts.spendingByCategory', 'Spending by Category')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {t('charts.spendingByCategory', 'Spending by Category')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map((entry, index) => {
            const percentage = ((entry.value / total) * 100).toFixed(1);
            const barWidth = (entry.value / maxValue) * 100;
            return (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {entry.name}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(entry.value)} ({percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: entry.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
