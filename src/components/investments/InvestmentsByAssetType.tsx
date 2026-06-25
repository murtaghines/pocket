import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";

interface AssetData {
  deposits: number;
  withdrawals: number;
  net: number;
}

interface InvestmentsByAssetTypeProps {
  data: Record<string, AssetData>;
}

const ASSET_COLORS: Record<string, string> = {
  'stocks':       'hsl(var(--category-investment))',
  'etf':          'hsl(var(--category-to-joint-account))',
  'bonds':        'hsl(var(--category-education))',
  'commodities':  'hsl(var(--category-salary))',
  'crypto':       'hsl(var(--category-health))',
  'savings':      'hsl(var(--category-refunds))',
  'Unclassified': 'hsl(var(--category-other-expense))',
};

export function InvestmentsByAssetType({ data }: InvestmentsByAssetTypeProps) {
  const { t } = useTranslation('investments');
  const { formatCurrency } = useLocalization();

  const getAssetLabel = (type: string) => {
    const labels: Record<string, string> = {
      'stocks': t('byAssetType.types.stocks'),
      'etf': t('byAssetType.types.etf'),
      'bonds': t('byAssetType.types.bonds'),
      'commodities': t('byAssetType.types.commodities'),
      'crypto': t('byAssetType.types.crypto'),
      'savings': t('byAssetType.types.savings'),
      'Unclassified': t('byAssetType.types.unclassified'),
    };
    return labels[type] || type;
  };

  const chartData = Object.entries(data)
    .map(([type, values]) => ({
      name: getAssetLabel(type),
      type,
      value: values.net,
      deposits: values.deposits,
      withdrawals: values.withdrawals,
      color: ASSET_COLORS[type] || 'hsl(var(--category-other-expense))',
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('byAssetType.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">{t('byAssetType.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('byAssetType.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), t('byAssetType.invested')]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}