import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface AssetData {
  deposits: number;
  withdrawals: number;
  net: number;
}

interface InvestmentsByAssetTypeProps {
  data: Record<string, AssetData>;
}

const ASSET_COLORS: Record<string, string> = {
  'stocks': '#3B82F6',
  'etf': '#8B5CF6',
  'bonds': '#10B981',
  'commodities': '#F59E0B',
  'crypto': '#EF4444',
  'savings': '#06B6D4',
  'Unclassified': '#6B7280',
};

const ASSET_LABELS: Record<string, string> = {
  'stocks': 'Stocks',
  'etf': 'ETFs',
  'bonds': 'Bonds',
  'commodities': 'Commodities',
  'crypto': 'Crypto',
  'savings': 'Savings',
  'Unclassified': 'Unclassified',
};

export function InvestmentsByAssetType({ data }: InvestmentsByAssetTypeProps) {
  const chartData = Object.entries(data)
    .map(([type, values]) => ({
      name: ASSET_LABELS[type] || type,
      type,
      value: values.net,
      deposits: values.deposits,
      withdrawals: values.withdrawals,
      color: ASSET_COLORS[type] || '#6B7280',
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' });

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>By Asset Type</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>By Asset Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Invested']}
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