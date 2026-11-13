import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHoldings } from "@/hooks/useHoldings";
import { useInvestmentInsights } from "@/hooks/useInvestmentInsights";
import { usePortfolioHighlights } from "@/hooks/usePortfolioHighlights";
import { PortfolioHeader } from "./PortfolioHeader";
import { PortfolioKpis } from "./PortfolioKpis";
import { HoldingsList } from "./HoldingsList";
import { AllocationChart } from "./AllocationChart";
import { CurrencyExposureCard } from "./CurrencyExposureCard";
import { PerformanceChart } from "./PerformanceChart";
import { DividendCalendar } from "./DividendCalendar";
import { RebalancingCard } from "./RebalancingCard";
import { AddHoldingDialog } from "./AddHoldingDialog";

export function PortfolioTab() {
  const { t } = useTranslation("investments");
  const { holdings, summary, isLoading, hasHoldings, isMultiCurrency, displayCurrency, pnlPercent } = useHoldings();
  const { insights } = useInvestmentInsights();
  const { highlights } = usePortfolioHighlights(holdings, summary, insights);
  const [addOpen, setAddOpen] = useState(false);

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
  const currencyForDisplay = isMultiCurrency ? displayCurrency : undefined;

  const bestId = highlights.bestPosition?.id ?? null;
  const worstId = highlights.worstPosition?.id ?? null;

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Row 0: Header — total value, P&L, controls */}
      <PortfolioHeader
        summary={summary}
        pnlPercent={pnlPercent}
        isMultiCurrency={isMultiCurrency}
        displayCurrency={displayCurrency}
        holdings={holdings}
      />

      {/* Row 1: 4 consolidated KPIs */}
      <PortfolioKpis
        summary={summary}
        pnlPercent={pnlPercent}
        displayCurrency={currencyForDisplay}
        ytdReturnPct={highlights.ytdReturnPct}
        insights={insights}
      />

      {/* Row 2: Performance chart + Allocation (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px] lg:h-[300px]">
        <PerformanceChart />
        <AllocationChart
          byAssetClass={summary.byAssetClass}
          byAccount={summary.byAccount}
          totalValue={summary.totalValue}
        />
      </div>

      {/* Row 3: Holdings table (promoted) */}
      <HoldingsList
        holdings={holdings}
        totalValue={summary.totalValue}
        displayCurrency={currencyForDisplay}
        bestHoldingId={bestId}
        worstHoldingId={worstId}
      />

      {/* Row 4: Dividend calendar + Rebalancing (conditional) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px] lg:h-[370px]">
        <DividendCalendar />
        <RebalancingCard summary={summary} />
      </div>

      {/* Row 5: Currency exposure (conditional) */}
      {showCurrencyExposure && (
        <CurrencyExposureCard
          exposure={highlights.currencyExposure}
          yieldOnCost={highlights.yieldOnCost}
          yieldOnCurrent={highlights.yieldOnCurrent}
        />
      )}
    </div>
  );
}
