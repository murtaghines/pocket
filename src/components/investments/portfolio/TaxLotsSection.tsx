import { useTranslation } from "react-i18next";
import { useTaxLots } from "@/hooks/useTaxLots";
import { useLocalization } from "@/hooks/useLocalization";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

interface TaxLotsSectionProps {
  holdingId: string;
  currency?: string;
}

export function TaxLotsSection({ holdingId, currency }: TaxLotsSectionProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency, formatDate } = useLocalization();
  const { openLots, closedLots, isLoading, hasLots } = useTaxLots(holdingId);

  if (isLoading) {
    return (
      <div className="border-t border-border pt-3">
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          {t("taxLots.title")}
        </p>
        <p className="text-xs text-muted-foreground py-4 text-center">...</p>
      </div>
    );
  }

  if (!hasLots) return null;

  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          {t("taxLots.title")}
        </p>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 tabular-nums">
            {t("taxLots.openCount", { count: openLots.length })}
          </Badge>
          {closedLots.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 tabular-nums">
              {t("taxLots.closedCount", { count: closedLots.length })}
            </Badge>
          )}
        </div>
      </div>

      {openLots.length > 0 && (
        <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
          {openLots.map((lot) => {
            const usedPct =
              lot.quantity_original > 0
                ? ((lot.quantity_original - lot.quantity_remaining) / lot.quantity_original) * 100
                : 0;
            return (
              <div
                key={lot.id}
                className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-muted/50"
              >
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(lot.acquired_at)}
                </span>
                <span className="tabular-nums text-xs font-medium">
                  {lot.quantity_remaining}
                  {lot.quantity_remaining !== lot.quantity_original && (
                    <span className="text-muted-foreground">/{lot.quantity_original}</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">@</span>
                <span className="tabular-nums text-xs font-medium">
                  {formatCurrency(lot.cost_per_unit, currency)}
                </span>
                {usedPct > 0 && usedPct < 100 && (
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${100 - usedPct}%`,
                          backgroundColor: "hsl(var(--primary))",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {(100 - usedPct).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
