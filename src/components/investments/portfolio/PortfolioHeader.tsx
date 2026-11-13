import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, ArrowLeftRight, Layers } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences, type CostMethod } from "@/hooks/useUserPreferences";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportButton } from "./ExportButton";
import { ExchangeRatesDialog } from "./ExchangeRatesDialog";
import type { PortfolioSummary } from "@/hooks/useHoldings";
import type { Holding } from "@/hooks/useHoldings";

interface PortfolioHeaderProps {
  summary: PortfolioSummary;
  pnlPercent: number;
  isMultiCurrency: boolean;
  displayCurrency?: string;
  holdings: Holding[];
}

export function PortfolioHeader({
  summary,
  pnlPercent,
  isMultiCurrency,
  displayCurrency,
  holdings,
}: PortfolioHeaderProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();
  const { preferences, updatePreferences } = useUserPreferences();
  const [ratesOpen, setRatesOpen] = useState(false);

  const costMethod: CostMethod = preferences.cost_method ?? "fifo";
  const isPositive = summary.totalPnl >= 0;
  const pnlFormatted = `${isPositive ? "+" : ""}${formatCurrency(summary.totalPnl, isMultiCurrency ? displayCurrency : undefined)}`;
  const pnlPctFormatted = `${isPositive ? "+" : ""}${pnlPercent.toFixed(1)}%`;
  const accountCount = Object.keys(summary.byAccount).length;

  return (
    <>
      <div className="rounded-xl bg-card shadow-section overflow-hidden px-5 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Left: value + P&L */}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-muted-foreground">
              {t("band.portfolioValue")}
            </p>
            <p className="text-[28px] md:text-[30px] font-bold tracking-[-0.025em] tabular-nums leading-none text-foreground mt-1.5">
              {formatCurrency(summary.totalValue, isMultiCurrency ? displayCurrency : undefined)}
            </p>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-[2px] rounded-full text-[12px] font-semibold tabular-nums",
                  isPositive
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {pnlFormatted}
                <span className="text-[11px] font-medium opacity-70">
                  ({pnlPctFormatted})
                </span>
              </span>
              <span className="text-[12px] text-muted-foreground">
                {summary.holdingsCount} {t("band.holdings")}
                {accountCount > 0 && ` · ${accountCount} ${t("band.accounts")}`}
              </span>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 border border-border rounded-lg px-2.5 py-1">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              <Select
                value={costMethod}
                onValueChange={(v) => updatePreferences({ cost_method: v as CostMethod })}
              >
                <SelectTrigger className="h-6 w-auto min-w-[70px] text-[12px] font-medium bg-transparent border-0 shadow-none focus:ring-0 gap-1 px-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">{t("taxLots.fifo")}</SelectItem>
                  <SelectItem value="lifo">{t("taxLots.lifo")}</SelectItem>
                  <SelectItem value="average">{t("taxLots.average")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isMultiCurrency && (
              <button
                type="button"
                onClick={() => setRatesOpen(true)}
                className="flex items-center gap-1.5 border border-border rounded-lg px-3 h-[30px] text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                {t("multicurrency.manageRates")}
              </button>
            )}

            <ExportButton holdings={holdings} />
          </div>
        </div>
      </div>

      {ratesOpen && (
        <ExchangeRatesDialog open={ratesOpen} onOpenChange={setRatesOpen} />
      )}
    </>
  );
}
