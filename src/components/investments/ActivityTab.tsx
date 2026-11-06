import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInvestments } from "@/hooks/useInvestments";
import { useInvestmentTransactions } from "@/hooks/useInvestmentTransactions";
import { useLocalization } from "@/hooks/useLocalization";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvestmentsByPlatform } from "./InvestmentsByPlatform";
import { InvestmentsByAssetType } from "./InvestmentsByAssetType";
import { InvestmentsHistory } from "./InvestmentsHistory";
import { InvestmentsTable } from "./InvestmentsTable";
import { TransactionsList } from "./TransactionsList";
import { RecordTransactionDialog } from "./RecordTransactionDialog";

export function ActivityTab() {
  const { t } = useTranslation("investments");
  const { t: tc } = useTranslation("common");
  const {
    investments,
    isLoading: isLoadingLegacy,
    hasData,
    byPlatform,
    byAssetType,
    monthlyHistory,
  } = useInvestments();
  const { transactions, isLoading: isLoadingTx } = useInvestmentTransactions();
  const [showRecord, setShowRecord] = useState(false);

  const isLoading = isLoadingLegacy || isLoadingTx;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAnyData = hasData || transactions.length > 0;

  if (!hasAnyData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{tc("noData")}</p>
        <Button onClick={() => setShowRecord(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("transactions.record")}
        </Button>
        <RecordTransactionDialog open={showRecord} onOpenChange={setShowRecord} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {t("transactions.allActivity")}
        </h2>
        <Button onClick={() => setShowRecord(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          {t("transactions.record")}
        </Button>
      </div>

      {transactions.length > 0 && <TransactionsList transactions={transactions} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <InvestmentsByPlatform data={byPlatform} />
        <InvestmentsByAssetType data={byAssetType} />
      </div>

      {monthlyHistory.length > 0 && <InvestmentsHistory data={monthlyHistory} />}

      {investments.length > 0 && <InvestmentsTable investments={investments} />}

      <RecordTransactionDialog open={showRecord} onOpenChange={setShowRecord} />
    </div>
  );
}
