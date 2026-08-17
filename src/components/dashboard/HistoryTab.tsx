import { useSearchParams } from "react-router-dom";
import { TotalView } from "@/components/dashboard/TotalView";
import { TransactionTable } from "@/components/dashboard/TransactionTable";

import { useTransactions } from "@/hooks/useTransactions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useHistoricalInsights } from "@/hooks/useHistoricalInsights";
import { useGranularity } from "@/hooks/useGranularity";
import { Loader2 } from "lucide-react";

/** Dashboard's "history" tab — all-time trend view. */
export function HistoryTab() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const { transactions, isLoading } = useTransactions();
  const [granularity] = useGranularity();

  const { monthlyData: periodData, isLoading: isDashLoading } = useDashboardData({ granularity });
  const { weekday, categoryTrend, isLoading: isHistLoading } = useHistoricalData({ granularity });

  const insights = useHistoricalInsights({
    monthlyData: periodData,
    granularity,
    serverWeekday: weekday,
    serverCategoryTrend: categoryTrend,
  });

  const sortedTransactions = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const anyLoading = isLoading || isDashLoading || isHistLoading;

  return (
    <main className="w-full">
      {anyLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!anyLoading && (
        <>
          <div className="mb-4">
            <TotalView monthlyData={periodData} insights={insights} granularity={granularity} />
          </div>

          <div
            className="bg-card rounded-xl p-[20px_22px_10px] shadow-section border border-border"
          >
            <div className="max-h-[500px] overflow-y-auto">
              <TransactionTable transactions={sortedTransactions} initialSearch={initialSearch} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
