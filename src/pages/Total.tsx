import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TotalView } from "@/components/dashboard/TotalView";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useTranslation } from "react-i18next";
import { Loader2, BarChart3 } from "lucide-react";

export default function Total() {
  const { t } = useTranslation('dashboard');
  const { transactions, monthlyData, isLoading } = useTransactions();
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { convertAmount } = useExchangeRates('EUR');

  const userCurrency = preferences?.base_currency || 'EUR';
  const convertToUserCurrency = (amount: number) => convertAmount(amount, 'EUR', userCurrency);

  const convertedMonthlyData = monthlyData.map(m => ({
    ...m,
    income: convertToUserCurrency(m.income),
    expenses: convertToUserCurrency(m.expenses),
    balance: convertToUserCurrency(m.balance),
  }));

  return (
    <DashboardLayout>
      <main className="max-w-[1400px] mx-auto">
        {(isLoading || prefsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !prefsLoading && (
          <>
            <div className="mb-6">
              <h3 className="text-2xl md:text-3xl font-semibold text-foreground">
                {t('views.total', 'Total')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('views.totalSubtitle', 'Accumulated view across all periods')}
              </p>
            </div>

            <div className="mb-4">
              <TotalView monthlyData={convertedMonthlyData} />
            </div>

            <div className="bg-card rounded-2xl p-3 md:p-4 border border-border" style={{ boxShadow: 'var(--shadow-section)' }}>
              <div className="max-h-[500px] overflow-y-auto">
                <TransactionTable transactions={transactions} />
              </div>
            </div>
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
