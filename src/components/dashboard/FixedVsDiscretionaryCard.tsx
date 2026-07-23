import { useTranslation } from "react-i18next";
import { Scale } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { EmptyState } from "@/components/ui/empty-state";
import type { EssentialSplit } from "@/lib/analytics";

interface FixedVsDiscretionaryCardProps {
  split: EssentialSplit;
}

/**
 * Splits the month's expenses into essential vs discretionary spending and shows the share of
 * discretionary (avoidable) spend. Uses semantic tokens: essential = muted, discretionary = warning.
 */
export function FixedVsDiscretionaryCard({ split }: FixedVsDiscretionaryCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const hasData = split.total > 0;
  const essentialPct = hasData ? Math.round((split.essential / split.total) * 100) : 0;
  const discretionaryPct = hasData ? 100 - essentialPct : 0;

  return (
    <div className="bg-card rounded-[18px] p-[20px_22px_18px] border border-border shadow-bento">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" strokeWidth={2} />
            {t("insights.essential.title")}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t("insights.essential.subtitle")}
          </p>
        </div>
        {hasData && (
          <span className="text-[13px] font-semibold text-warning-foreground bg-warning/90 rounded-full px-2.5 py-1 whitespace-nowrap">
            {t("insights.essential.discretionaryShare", { pct: split.discretionaryPct })}
          </span>
        )}
      </div>

      {!hasData ? (
        <EmptyState height="h-[140px]" />
      ) : (
        <>
          {/* Stacked proportion bar */}
          <div className="flex w-full h-3 rounded-full overflow-hidden bg-muted/40">
            <div
              className="h-full bg-muted-foreground/50"
              style={{ width: `${essentialPct}%` }}
              aria-label={t("insights.essential.essential")}
            />
            <div
              className="h-full bg-warning"
              style={{ width: `${discretionaryPct}%` }}
              aria-label={t("insights.essential.discretionary")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                <span className="text-[12px] text-muted-foreground">
                  {t("insights.essential.essential")}
                </span>
              </div>
              <div className="text-[17px] font-semibold tabular-nums text-foreground mt-0.5">
                {formatCurrency(split.essential)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-[12px] text-muted-foreground">
                  {t("insights.essential.discretionary")}
                </span>
              </div>
              <div className="text-[17px] font-semibold tabular-nums text-foreground mt-0.5">
                {formatCurrency(split.discretionary)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
