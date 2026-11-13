import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLocalization } from "@/hooks/useLocalization";
import { ASSET_CLASS_CONFIG, assetColor } from "./assetClassConfig";
import { cn } from "@/lib/utils";

type ViewMode = "assetClass" | "account";

interface AllocationChartProps {
  byAssetClass: Record<string, { value: number; costBasis: number; pnl: number; count: number }>;
  byAccount: Record<string, { value: number; costBasis: number; pnl: number; count: number }>;
  totalValue: number;
}

const CHART_COLORS = Array.from({ length: 8 }, (_, i) => `hsl(var(--chart-${i + 1}))`);

function AllocationTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card rounded-lg shadow-popup px-4 py-3 min-w-[160px]">
      <p className="text-[13px] font-medium text-foreground mb-1">{d.name}</p>
      <p className="text-[15px] font-semibold tabular-nums text-foreground">
        {d.formattedValue}
      </p>
      <p className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
        {d.weight.toFixed(1)}%
      </p>
    </div>
  );
}

export function AllocationChart({ byAssetClass, byAccount, totalValue }: AllocationChartProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();
  const [view, setView] = useState<ViewMode>("assetClass");

  const hasAccounts = Object.keys(byAccount).length > 0;
  const data = view === "assetClass" ? byAssetClass : byAccount;

  const chartData = Object.entries(data)
    .map(([key, v], i) => {
      if (view === "assetClass") {
        const cfg = ASSET_CLASS_CONFIG[key] ?? ASSET_CLASS_CONFIG.other;
        return {
          name: t(`byAssetType.types.${cfg.i18nKey}`),
          value: v.value,
          formattedValue: formatCurrency(v.value),
          weight: totalValue > 0 ? (v.value / totalValue) * 100 : 0,
          color: assetColor(cfg),
        };
      }
      return {
        name: key || t("portfolio.noAccount"),
        value: v.value,
        formattedValue: formatCurrency(v.value),
        weight: totalValue > 0 ? (v.value / totalValue) * 100 : 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
        <div className="px-5 pt-4 pb-2 shrink-0">
          <h3 className="text-[13px] font-medium text-muted-foreground">
            {t("portfolio.allocation")}
          </h3>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-5 pb-4">
          <p className="text-muted-foreground text-sm">{t("portfolio.noHoldings")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <h3 className="text-[13px] font-medium text-muted-foreground">
          {t("portfolio.allocation")}
        </h3>
        {hasAccounts && (
          <div className="flex bg-muted/60 rounded-[8px] p-[3px]">
            <button
              type="button"
              onClick={() => setView("assetClass")}
              className={cn(
                "px-2.5 py-[3px] rounded-[6px] text-[11px] font-medium transition-all",
                view === "assetClass"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("portfolio.allocation")}
            </button>
            <button
              type="button"
              onClick={() => setView("account")}
              className={cn(
                "px-2.5 py-[3px] rounded-[6px] text-[11px] font-medium transition-all",
                view === "account"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("portfolio.allocationByAccount")}
            </button>
          </div>
        )}
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
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<AllocationTooltip />} />
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
                  {d.formattedValue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
