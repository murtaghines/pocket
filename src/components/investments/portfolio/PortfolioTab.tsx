import { useHoldings } from "@/hooks/useHoldings";
import { useTranslation } from "react-i18next";
import { Loader2, PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioKpis } from "./PortfolioKpis";
import { HoldingsList } from "./HoldingsList";
import { AllocationChart } from "./AllocationChart";
import { PerformanceChart } from "./PerformanceChart";
import { useState } from "react";
import { AddHoldingDialog } from "./AddHoldingDialog";

export function PortfolioTab() {
  const { t } = useTranslation("investments");
  const { holdings, summary, isLoading, hasHoldings, pnlPercent } = useHoldings();
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

  return (
    <div className="flex flex-col gap-[16px]">
      <PortfolioKpis summary={summary} pnlPercent={pnlPercent} />

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

      <PerformanceChart />

      <HoldingsList holdings={holdings} totalValue={summary.totalValue} />
    </div>
  );
}
