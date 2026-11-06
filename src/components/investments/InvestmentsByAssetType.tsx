import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 px-4 py-3 min-w-[150px]">
        <p className="text-xs font-medium text-foreground mb-1">{d.name}</p>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">{t('byAssetType.invested')}</span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(d.value)}
          </span>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
        <div className="px-6 pt-5 pb-3 shrink-0">
          <h3 className="text-base font-semibold">{t('byAssetType.title')}</h3>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-6 pb-5">
          <p className="text-sm text-muted-foreground">{t('byAssetType.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 shrink-0">
        <h3 className="text-base font-semibold">{t('byAssetType.title')}</h3>
      </div>
      <div className="flex-1 min-h-0 px-6 pb-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={70}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
