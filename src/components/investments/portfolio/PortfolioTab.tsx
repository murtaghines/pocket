import { useHoldings } from "@/hooks/useHoldings";
import { useInvestmentInsights } from "@/hooks/useInvestmentInsights";
import { usePortfolioHighlights } from "@/hooks/usePortfolioHighlights";
import { useTranslation } from "react-i18next";
import { Loader2, PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioKpis } from "./PortfolioKpis";
import { PortfolioHighlights } from "./PortfolioHighlights";
import { HoldingsList } from "./HoldingsList";
import { AllocationChart } from "./AllocationChart";
import { CurrencyExposureCard } from "./CurrencyExposureCard";
import { PerformanceChart } from "./PerformanceChart";
import { InsightsCards } from "./InsightsCards";
import { DividendCalendar } from "./DividendCalendar";
import { RebalancingCard } from "./RebalancingCard";
import { PortfolioInfoSection } from "./PortfolioInfoSection";
import { ExportButton } from "./ExportButton";
import { ExchangeRatesDialog } from "./ExchangeRatesDialog";
import { CostMethodSelector } from "./CostMethodSelector";
import { useState } from "react";
import { AddHoldingDialog } from "./AddHoldingDialog";

export function PortfolioTab() {
  const { t } = useTranslation("investments");
  const { holdings, summary, isLoading, hasHoldings, isMultiCurrency, displayCurrency, pnlPercent } = useHoldings();
  const { insights } = useInvestmentInsights();
  const { highlights } = usePortfolioHighlights(holdings, summary, insights);
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

  const showCurrencyExposure = highlights.currencyExposure.length > 1;

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Row 1: KPIs */}
      <PortfolioKpis summary={summary} pnlPercent={pnlPercent} displayCurrency={isMultiCurrency ? displayCurrency : undefined} />

      {/* Row 2: Highlights */}
      <PortfolioHighlights
        highlights={highlights}
        insights={insights}
        displayCurrency={isMultiCurrency ? displayCurrency : undefined}
      />

      {/* Row 3: Allocation charts + Currency Exposure */}
      <div className={`grid grid-cols-1 gap-[14px] ${showCurrencyExposure ? "lg:grid-cols-3" : "md:grid-cols-2"} lg:h-[300px]`}>
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
        {showCurrencyExposure && (
          <CurrencyExposureCard
            exposure={highlights.currencyExposure}
            yieldOnCost={highlights.yieldOnCost}
            yieldOnCurrent={highlights.yieldOnCurrent}
          />
        )}
      </div>

      {/* Row 4: Insights */}
      <InsightsCards />

      {/* Row 5: Performance chart */}
      <div className="lg:h-[300px]">
        <PerformanceChart />
      </div>

      {/* Row 6: Dividend calendar + Rebalancing side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px] lg:h-[370px]">
        <DividendCalendar />
        <RebalancingCard summary={summary} />
      </div>

      {/* Row 7: Info section */}
      <PortfolioInfoSection info={highlights.info} />

      {/* Row 8: Holdings list */}
      <HoldingsList holdings={holdings} totalValue={summary.totalValue} displayCurrency={isMultiCurrency ? displayCurrency : undefined} />

      {ratesOpen && (
        <ExchangeRatesDialog open={ratesOpen} onOpenChange={setRatesOpen} />
      )}
    </div>
  );
}
