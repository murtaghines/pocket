import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { TotalView } from "@/components/dashboard/TotalView";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { GranularityToggle } from "@/components/dashboard/GranularityToggle";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useHistoricalInsights } from "@/hooks/useHistoricalInsights";
import { useGranularity } from "@/hooks/useGranularity";
import { bucketByGranularity } from "@/lib/analytics";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";

export default function History() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const { t } = useTranslation("dashboard");
  const { transactions, isLoading } = useTransactions();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");

  // Granularity of the whole History analysis (persisted to ?g=). Driven from the sticky top bar
  // on desktop and from the in-body toggle on mobile — both read/write the same param.
  const [granularity, setGranularity] = useGranularity();

  const userCurrency = preferences?.base_currency || "EUR";
  const convertToUserCurrency = useCallback(
    (amount: number) => convertAmount(amount, "EUR", userCurrency),
    [convertAmount, userCurrency],
  );

  // Re-bucket every transaction at the selected granularity (week / month / year), converted to
  // the user's base currency. This drives every chart/KPI in TotalView.
  const periodData = useMemo(
    () => bucketByGranularity(transactions, granularity, convertToUserCurrency),
    [transactions, granularity, convertToUserCurrency],
  );

  // Advanced all-time insights (rolling averages, category trends, seasonality, weekday pattern).
  const insights = useHistoricalInsights({
    transactions,
    monthlyData: periodData,
    convert: convertToUserCurrency,
    granularity,
  });

  // Sort transactions newest first for the historical table
  const sortedTransactions = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <DashboardLayout>
      <main className="w-full">
        {(isLoading || prefsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !prefsLoading && (
          <>
            {/* Page header — mobile only; desktop renders in the sticky top bar */}
            <div className="mb-6 md:hidden">
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {t("views.history", "History")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("views.historySubtitle", "All your data, every period combined")}
              </p>
            </div>

            {/* Granularity selector — mobile only; desktop shows it pinned in the top bar */}
            <div className="mb-4 flex justify-center md:hidden">
              <GranularityToggle value={granularity} onChange={setGranularity} />
            </div>

            <div className="mb-4">
              <TotalView monthlyData={periodData} insights={insights} granularity={granularity} />
            </div>

            <div
              className="bg-card rounded-2xl p-[20px_22px_10px] shadow-bento"
            >
              <div className="max-h-[500px] overflow-y-auto">
                <TransactionTable transactions={sortedTransactions} initialSearch={initialSearch} />
              </div>
            </div>
          </>
        )}
      </main>

      <DashboardFooter />
    </DashboardLayout>
  );
}
