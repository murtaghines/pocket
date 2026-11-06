import { useHoldings } from "@/hooks/useHoldings";
import { useTranslation } from "react-i18next";
import { Loader2, PiggyBank, Plus, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortfolioKpis } from "./PortfolioKpis";
import { HoldingsList } from "./HoldingsList";
import { AllocationChart } from "./AllocationChart";
import { PerformanceChart } from "./PerformanceChart";
import { InsightsCards } from "./InsightsCards";
import { DividendCalendar } from "./DividendCalendar";
import { RebalancingCard } from "./RebalancingCard";
import { ExportButton } from "./ExportButton";
import { ExchangeRatesDialog } from "./ExchangeRatesDialog";
import { CostMethodSelector } from "./CostMethodSelector";
import { useState } from "react";
import { AddHoldingDialog } from "./AddHoldingDialog";

export function PortfolioTab() {
  const { t } = useTranslation("investments");
  const { holdings, summary, isLoading, hasHoldings, isMultiCurrency, displayCurrency, pnlPercent } = useHoldings();
  const [addOpen, setAddOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasHoldings) {
    return (
      <>
        <div className="bg-card rounded-xl p-8 text-center border border-border shadow-section">
          <PiggyBank className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t("portfolio.emptyTitle")}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t("portfolio.emptyDescription")}
          </p>
          <Button variant="gradient" size="lg" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("portfolio.addFirst")}
          </Button>
        </div>
        <AddHoldingDialog open={addOpen} onOpenChange={setAddOpen} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center gap-2 flex-wrap">
        {isMultiCurrency && (
          <>
            <Badge variant="outline" className="text-xs tabular-nums gap-1">
              {t("multicurrency.displayIn")} {displayCurrency}
            </Badge>
            {summary.unconvertedCount != null && summary.unconvertedCount > 0 && (
              <Badge variant="secondary" className="text-xs text-warning gap-1">
                {t("multicurrency.unconvertedCount", { count: summary.unconvertedCount })}
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs"
              onClick={() => setRatesOpen(true)}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {t("multicurrency.manageRates")}
            </Button>
          </>
        )}
        <CostMethodSelector />
        <div className="ml-auto">
          <ExportButton holdings={holdings} />
        </div>
      </div>
      <PortfolioKpis summary={summary} pnlPercent={pnlPercent} displayCurrency={isMultiCurrency ? displayCurrency : undefined} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <AllocationChart
          data={summary.byAssetClass}
          totalValue={summary.totalValue}
          title={t("portfolio.allocation")}
        />
        <AllocationChart
          data={summary.byAccount}
          totalValue={summary.totalValue}
          title={t("portfolio.allocationByAccount")}
        />
      </div>

      <InsightsCards />

      <DividendCalendar />

      <PerformanceChart />

      <RebalancingCard summary={summary} />

      <HoldingsList holdings={holdings} totalValue={summary.totalValue} displayCurrency={isMultiCurrency ? displayCurrency : undefined} />

      {ratesOpen && (
        <ExchangeRatesDialog open={ratesOpen} onOpenChange={setRatesOpen} />
      )}
    </div>
  );
}
