import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { TotalView } from "@/components/dashboard/TotalView";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

export default function History() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const { t } = useTranslation("dashboard");
  const { transactions, monthlyData, isLoading } = useTransactions();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");

  const userCurrency = preferences?.base_currency || "EUR";
  const convertToUserCurrency = (amount: number) =>
    convertAmount(amount, "EUR", userCurrency);

  const convertedMonthlyData = monthlyData.map((m) => ({
    ...m,
    income: convertToUserCurrency(m.income),
    expenses: convertToUserCurrency(m.expenses),
    balance: convertToUserCurrency(m.balance),
  }));

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
                {t(
                  "views.historySubtitle",
                  "All your data, every month combined",
                )}
              </p>
            </div>

            <div className="mb-4">
              <TotalView monthlyData={convertedMonthlyData} />
            </div>

            <div
              className="bg-card rounded-[18px] p-[20px_22px_10px] border border-border shadow-bento"
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