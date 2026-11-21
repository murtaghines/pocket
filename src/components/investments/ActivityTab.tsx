import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useInvestmentTransactions } from "@/hooks/useInvestmentTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvestmentsByAccount } from "./InvestmentsByAccount";
import { InvestmentsByAsset } from "./InvestmentsByAsset";
import { InvestmentActivityHistory } from "./InvestmentActivityHistory";
import { TransactionsList } from "./TransactionsList";
import { RecordTransactionDialog } from "./RecordTransactionDialog";
import { computeByAccount, computeByAsset, computeMonthlyHistory } from "@/lib/investmentAggregates";

export function ActivityTab() {
  const { t } = useTranslation("investments");
  const { t: tc } = useTranslation("common");
  const { transactions, isLoading } = useInvestmentTransactions();
  const { getInvestmentAccounts } = useAccounts();
  const investmentAccounts = getInvestmentAccounts();
  const [showRecord, setShowRecord] = useState(false);

  const byAccount = useMemo(
    () => computeByAccount(transactions, investmentAccounts),
    [transactions, investmentAccounts],
  );
  const byAsset = useMemo(() => computeByAsset(transactions), [transactions]);
  const monthlyHistory = useMemo(() => computeMonthlyHistory(transactions), [transactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
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
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {t("transactions.allActivity")}
        </h2>
        <Button onClick={() => setShowRecord(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          {t("transactions.record")}
        </Button>
      </div>

      <TransactionsList transactions={transactions} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] lg:h-[300px]">
        <InvestmentsByAccount data={byAccount} />
        <InvestmentsByAsset data={byAsset} />
      </div>

      {monthlyHistory.length > 0 && (
        <div className="lg:h-[300px]">
          <InvestmentActivityHistory data={monthlyHistory} />
        </div>
      )}

      <RecordTransactionDialog open={showRecord} onOpenChange={setShowRecord} />
    </div>
  );
}
