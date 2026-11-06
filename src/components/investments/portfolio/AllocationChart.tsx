import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLocalization } from "@/hooks/useLocalization";
import { ASSET_CLASS_CONFIG } from "./assetClassConfig";

interface AllocationChartProps {
  data: Record<string, { value: number; costBasis: number; pnl: number; count: number }>;
  totalValue: number;
  title?: string;
}

export function AllocationChart({ data, totalValue, title }: AllocationChartProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  const chartData = Object.entries(data)
    .map(([key, v]) => {
      const cfg = ASSET_CLASS_CONFIG[key] ?? ASSET_CLASS_CONFIG.other;
      return {
        name: t(`byAssetType.types.${cfg.i18nKey}`),
        value: v.value,
        pnl: v.pnl,
        count: v.count,
        weight: totalValue > 0 ? (v.value / totalValue) * 100 : 0,
        color: `hsl(${cfg.hue} ${cfg.sat}% ${cfg.light}%)`,
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
        <div className="px-5 pt-4 pb-2 shrink-0">
          <h3 className="text-[13px] font-medium text-muted-foreground">
            {title ?? t("portfolio.allocation")}
          </h3>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-5 pb-4">
          <p className="text-muted-foreground text-sm">{t("portfolio.noHoldings")}</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border/50 px-4 py-3 min-w-[160px]">
        <p className="text-[13px] font-medium text-foreground mb-1">{d.name}</p>
        <p className="text-[15px] font-semibold tabular-nums text-foreground">
          {formatCurrency(d.value)}
        </p>
        <p className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
          {d.weight.toFixed(1)}%
        </p>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="px-5 pt-4 pb-2 shrink-0">
        <h3 className="text-[13px] font-medium text-muted-foreground">
          {title ?? t("portfolio.allocation")}
        </h3>
      </div>
      <div className="flex-1 min-h-0 px-5 pb-4">
        <div className="flex flex-col md:flex-row items-center gap-4 h-full">
          <div className="w-full md:w-1/2 min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-1.5 min-h-0 overflow-y-auto">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {d.name}
                  </p>
                </div>
                <span className="text-[13px] font-semibold tabular-nums shrink-0">
                  {d.weight.toFixed(1)}%
                </span>
                <span className="text-[12px] text-muted-foreground tabular-nums shrink-0 w-[80px] text-right">
                  {formatCurrency(d.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
