import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import type { AssetBreakdown } from "@/lib/investmentAggregates";

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--category-investment))',
  'hsl(var(--category-to-joint-account))',
  'hsl(var(--category-salary))',
  'hsl(var(--category-freelance))',
  'hsl(var(--category-refunds))',
  'hsl(var(--category-education))',
  'hsl(var(--category-rents))',
];

function AssetTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card rounded-lg shadow-popup px-4 py-3 min-w-[150px]">
      <p className="text-xs font-medium text-foreground mb-1">{d.name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-xs text-muted-foreground">{d._labelNet}</span>
        <span className="text-sm font-semibold tabular-nums">{d._fmtValue}</span>
      </div>
    </div>
  );
}

interface InvestmentsByAssetProps {
  data: AssetBreakdown[];
}

export function InvestmentsByAsset({ data }: InvestmentsByAssetProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  const chartData = data
    .filter((d) => d.net > 0)
    .slice(0, 10)
    .map((d, i) => ({
      name: d.label,
      value: d.net,
      color: COLORS[i % COLORS.length],
      _labelNet: t("byAsset.net", "Net invested"),
      _fmtValue: formatCurrency(d.net),
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
        <div className="px-6 pt-5 pb-3 shrink-0">
          <h3 className="text-base font-semibold">{t("byAsset.title", "By Asset")}</h3>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-6 pb-5">
          <p className="text-sm text-muted-foreground">{t("byAsset.noData", "No data by asset")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 shrink-0">
        <h3 className="text-base font-semibold">{t("byAsset.title", "By Asset")}</h3>
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
            <Tooltip content={<AssetTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
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
