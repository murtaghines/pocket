import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings2, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLocalization } from "@/hooks/useLocalization";
import { useTargetAllocations } from "@/hooks/useTargetAllocations";
import type { PortfolioSummary } from "@/hooks/useHoldings";
import { ASSET_CLASS_CONFIG, ASSET_CLASS_KEYS, assetColor } from "./assetClassConfig";

interface RebalancingCardProps {
  summary: PortfolioSummary;
}

export function RebalancingCard({ summary }: RebalancingCardProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();
  const { targetMap, totalTargetPct, upsertTarget, deleteTarget } = useTargetAllocations();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const activeClasses = Object.keys(summary.byAssetClass);
  const allClasses = [...new Set([...activeClasses, ...Object.keys(targetMap)])];

  const hasTargets = Object.keys(targetMap).length > 0;

  const startEditing = () => {
    const d: Record<string, string> = {};
    for (const cls of ASSET_CLASS_KEYS) {
      d[cls] = targetMap[cls] != null ? String(targetMap[cls]) : "";
    }
    setDraft(d);
    setEditing(true);
  };

  const handleSave = async () => {
    const entries = Object.entries(draft).filter(([, v]) => v.trim() !== "");
    const total = entries.reduce((s, [, v]) => s + (parseFloat(v) || 0), 0);

    if (total > 100) {
      toast.error(t("rebalancing.totalExceeds100"));
      return;
    }

    for (const [cls, val] of entries) {
      const pct = parseFloat(val);
      if (!isNaN(pct) && pct > 0) {
        await upsertTarget.mutateAsync({ asset_class: cls, target_pct: pct });
      }
    }
    for (const cls of ASSET_CLASS_KEYS) {
      const val = draft[cls]?.trim();
      if ((!val || parseFloat(val) === 0) && targetMap[cls] != null) {
        await deleteTarget.mutateAsync(cls);
      }
    }

    setEditing(false);
    toast.success(t("rebalancing.saved"));
  };

  const rows = allClasses
    .map((cls) => {
      const actual = summary.byAssetClass[cls];
      const actualPct = summary.totalValue > 0 && actual
        ? (actual.value / summary.totalValue) * 100
        : 0;
      const target = targetMap[cls] ?? 0;
      const diff = target > 0 ? actualPct - target : 0;
      const diffAmount = target > 0 && summary.totalValue > 0
        ? (diff / 100) * summary.totalValue
        : 0;
      const cfg = ASSET_CLASS_CONFIG[cls] ?? ASSET_CLASS_CONFIG.other;
      return {
        cls,
        cfg,
        actualPct,
        target,
        diff,
        diffAmount,
        actualValue: actual?.value ?? 0,
      };
    })
    .filter((r) => r.target > 0 || r.actualPct > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  if (!hasTargets && !editing) {
    return (
      <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
        <div className="flex flex-row items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <h3 className="text-base font-semibold">{t("rebalancing.title")}</h3>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startEditing}>
            <Settings2 className="w-3.5 h-3.5" />
            {t("rebalancing.setTargets")}
          </Button>
        </div>
        <div className="px-6 pb-5 flex-1 min-h-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("rebalancing.noTargets")}
          </p>
        </div>
      </div>
    );
  }

  if (editing) {
    const draftTotal = ASSET_CLASS_KEYS.reduce(
      (s, k) => s + (parseFloat(draft[k] || "0") || 0),
      0
    );

    return (
      <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
        <div className="flex flex-row items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <h3 className="text-base font-semibold">{t("rebalancing.setTargets")}</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={upsertTarget.isPending || draftTotal > 100}
            >
              <Check className="w-4 h-4" />
              {t("portfolio.save")}
            </Button>
          </div>
        </div>
        <div className="px-6 pb-5 flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {ASSET_CLASS_KEYS.map((cls) => {
              const cfg = ASSET_CLASS_CONFIG[cls];
              return (
                <div key={cls} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: assetColor(cfg) }}
                  />
                  <span className="text-sm flex-1 min-w-0 truncate">
                    {t(`byAssetType.types.${cfg.i18nKey}`)}
                  </span>
                  <div className="relative w-[80px]">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      value={draft[cls] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [cls]: e.target.value }))}
                      className="h-8 text-sm tabular-nums pr-6 rounded-lg"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-sm text-muted-foreground">{t("rebalancing.total")}</span>
            <span
              className={`text-sm font-semibold tabular-nums ${
                draftTotal > 100 ? "text-destructive" : draftTotal === 100 ? "text-success" : "text-foreground"
              }`}
            >
              {draftTotal.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="flex flex-row items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <div>
          <h3 className="text-base font-semibold">{t("rebalancing.title")}</h3>
          {totalTargetPct < 100 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("rebalancing.allocated", { pct: totalTargetPct.toFixed(0) })}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={startEditing}>
          <Settings2 className="w-3.5 h-3.5" />
          {t("rebalancing.edit")}
        </Button>
      </div>
      <div className="px-6 pb-5 flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const overweight = r.diff > 2;
            const underweight = r.diff < -2;
            return (
              <div key={r.cls} className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: assetColor(r.cfg) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">
                      {t(`byAssetType.types.${r.cfg.i18nKey}`)}
                    </span>
                    {(overweight || underweight) && (
                      <AlertTriangle
                        className={`w-3 h-3 shrink-0 ${
                          overweight ? "text-warning" : "text-primary"
                        }`}
                      />
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                    <div className="h-full relative">
                      <div
                        className="absolute inset-y-0 left-0 bg-border rounded-full"
                        style={{ width: `${Math.min(r.target, 100)}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${Math.min(r.actualPct, 100)}%`,
                          backgroundColor: assetColor(r.cfg),
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 w-[100px]">
                  <span className="text-sm tabular-nums font-medium">
                    {r.actualPct.toFixed(1)}%
                  </span>
                  {r.target > 0 && (
                    <span className="text-[11px] text-muted-foreground tabular-nums ml-1">
                      / {r.target.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0 w-[80px]">
                  {r.target > 0 && r.diff !== 0 && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] tabular-nums ${
                        overweight
                          ? "text-warning border-warning/30"
                          : underweight
                            ? "text-primary border-primary/30"
                            : "text-muted-foreground"
                      }`}
                    >
                      {r.diff > 0 ? "+" : ""}
                      {r.diff.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
