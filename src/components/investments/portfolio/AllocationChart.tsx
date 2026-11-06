import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle>{title ?? t("portfolio.allocation")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground text-sm">{t("portfolio.noHoldings")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? t("portfolio.allocation")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/2">
            <ResponsiveContainer width="100%" height={220}>
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
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), ""]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.name ?? ""
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-2">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {d.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-semibold tabular-nums">
                    {d.weight.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right shrink-0 w-[90px]">
                  <span className="text-[12px] text-muted-foreground tabular-nums">
                    {formatCurrency(d.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
