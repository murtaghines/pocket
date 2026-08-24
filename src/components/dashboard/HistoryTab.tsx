import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { TotalView } from "@/components/dashboard/TotalView";
import { TransactionTable } from "@/components/dashboard/TransactionTable";

import { useTransactions } from "@/hooks/useTransactions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useHistoricalInsights } from "@/hooks/useHistoricalInsights";
import { useGranularity } from "@/hooks/useGranularity";

const PAGE_SIZE = 100;

/** Dashboard's "history" tab — all-time trend view with paginated transactions. */
export function HistoryTab() {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [page, setPage] = useState(1);

  const { transactions, isLoading, totalCount } = useTransactions({ page, pageSize: PAGE_SIZE });
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

  const totalPages = totalCount != null ? Math.ceil(totalCount / PAGE_SIZE) : 1;
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
            className="bg-card rounded-xl p-[20px_0_6px] shadow-section"
          >
            <div className="max-h-[500px] overflow-y-auto">
              <TransactionTable
                transactions={sortedTransactions}
                initialSearch={initialSearch}
                totalCount={totalCount ?? undefined}
              />
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 pb-2 px-1">
                <p className="text-sm text-muted-foreground tabular-nums">
                  {tc('pagination.showing', {
                    from: (page - 1) * PAGE_SIZE + 1,
                    to: Math.min(page * PAGE_SIZE, totalCount ?? 0),
                    total: totalCount,
                  })}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-muted-foreground tabular-nums min-w-[80px] text-center">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
