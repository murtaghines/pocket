import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BestWorst } from "@/hooks/usePortfolioHighlights";

interface PositionHighlightsCardProps {
  bestPosition: BestWorst | null;
  worstPosition: BestWorst | null;
  displayCurrency?: string;
}

function PositionRow({
  label,
  position,
  variant,
  formatCurrency,
}: {
  label: string;
  position: BestWorst;
  variant: "best" | "worst";
  formatCurrency: (n: number, c?: string) => string;
}) {
  const isBest = variant === "best";
  const bgClass = isBest ? "bg-success/5" : "bg-destructive/5";
  const textClass = isBest ? "text-success" : "text-destructive";
  const iconBg = isBest ? "bg-success/10" : "bg-destructive/10";

  return (
    <div className={cn("rounded-lg px-4 py-3 flex items-center gap-3", bgClass)}>
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBg, textClass)}>
        {isBest
          ? <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
          : <TrendingDown className="w-4 h-4" strokeWidth={2.5} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground truncate">
          {position.name}
          {position.ticker && (
            <span className="text-muted-foreground font-normal ml-1">
              {position.ticker}
            </span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-sm font-semibold tabular-nums", textClass)}>
          {position.pnlPct > 0 ? "+" : ""}{position.pnlPct.toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {position.pnl > 0 ? "+" : ""}{formatCurrency(position.pnl)}
        </p>
      </div>
    </div>
  );
}

export function PositionHighlightsCard({
  bestPosition,
  worstPosition,
  displayCurrency,
}: PositionHighlightsCardProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  const fmt = (n: number) => formatCurrency(n, displayCurrency);

  const hasAny = bestPosition || worstPosition;

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="px-5 pt-4 pb-2 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">
          {t("highlights.positionHighlights")}
        </h3>
      </div>
      <div className="flex-1 min-h-0 px-5 pb-4 flex flex-col gap-2 justify-center">
        {hasAny ? (
          <>
            {bestPosition && (
              <PositionRow
                label={t("highlights.bestPosition")}
                position={bestPosition}
                variant="best"
                formatCurrency={fmt}
              />
            )}
            {worstPosition && (
              <PositionRow
                label={t("highlights.worstPosition")}
                position={worstPosition}
                variant="worst"
                formatCurrency={fmt}
              />
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            {t("highlights.noPositionsToCompare")}
          </p>
        )}
      </div>
    </div>
  );
}
