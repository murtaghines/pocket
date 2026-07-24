import { useTranslation } from "react-i18next";
import { Gauge } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import type { SpendPace } from "@/lib/analytics";

interface SpendPaceCardProps {
  pace: SpendPace;
  /** Historical average monthly expense (converted), for the pace benchmark. */
  avgMonthlyExpenses: number;
}

/**
 * Monthly spend-pace card: how much has been spent so far, and — for the in-progress month —
 * the linearly projected month-end total, benchmarked against the user's average monthly spend.
 * For a closed month it compares the actual total against that average instead.
 */
export function SpendPaceCard({ pace, avgMonthlyExpenses }: SpendPaceCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  // The figure we benchmark: projection while in progress, else the real total.
  const benchmarkValue = pace.inProgress ? pace.projected : pace.spentSoFar;
  const deltaPct =
    avgMonthlyExpenses > 0
      ? Math.round(((benchmarkValue - avgMonthlyExpenses) / avgMonthlyExpenses) * 100)
      : null;

  const progress = pace.totalDays > 0 ? Math.min(100, (pace.elapsedDays / pace.totalDays) * 100) : 0;

  let deltaLabel: string;
  let deltaClass: string;
  if (deltaPct === null) {
    deltaLabel = "";
    deltaClass = "text-muted-foreground";
  } else if (deltaPct > 3) {
    deltaLabel = t("insights.spendPace.over", { pct: Math.abs(deltaPct) });
    deltaClass = "text-destructive";
  } else if (deltaPct < -3) {
    deltaLabel = t("insights.spendPace.under", { pct: Math.abs(deltaPct) });
    deltaClass = "text-success";
  } else {
    deltaLabel = t("insights.spendPace.onTrack");
    deltaClass = "text-muted-foreground";
  }

  return (
    <div className="bg-card rounded-2xl p-[18px_18px_16px] shadow-bento">
      <div className="flex items-center justify-between mb-[14px]">
        <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
          {t("insights.spendPace.title")}
        </span>
        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[9px] shrink-0 bg-primary/10 text-primary">
          <Gauge className="w-[17px] h-[17px]" strokeWidth={2.2} />
        </div>
      </div>

      <div className="text-[25px] font-bold tracking-[-0.02em] tabular-nums leading-none text-foreground">
        {formatCurrency(pace.spentSoFar)}
      </div>
      <div className="text-[12px] mt-[5px] text-muted-foreground">
        {pace.inProgress
          ? t("insights.spendPace.dayOf", { elapsed: pace.elapsedDays, total: pace.totalDays })
          : t("insights.spendPace.spentSoFar")}
      </div>

      {pace.inProgress && (
        <>
          {/* Elapsed-days progress bar */}
          <div className="w-full h-1.5 rounded-full bg-muted/60 mt-3">
            <div
              className="h-full rounded-full bg-primary/70 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[12px] mt-2 text-muted-foreground tabular-nums">
            {t("insights.spendPace.projected")}:{" "}
            <span className="font-semibold text-foreground">{formatCurrency(pace.projected)}</span>
          </div>
        </>
      )}

      {deltaLabel && (
        <div className={`text-[12px] mt-1.5 font-medium ${deltaClass}`}>{deltaLabel}</div>
      )}
    </div>
  );
}
