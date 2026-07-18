import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInvestments } from "@/hooks/useInvestments";
import { useLocalization } from "@/hooks/useLocalization";
import { Loader2, TrendingUp, Wallet, PiggyBank, Building2, Upload } from "lucide-react";
import { InvestmentAccountsManager } from "@/components/investments/InvestmentAccountsManager";
import { InvestmentsByPlatform } from "@/components/investments/InvestmentsByPlatform";
import { InvestmentsByAssetType } from "@/components/investments/InvestmentsByAssetType";
import { InvestmentsHistory } from "@/components/investments/InvestmentsHistory";
import { InvestmentsTable } from "@/components/investments/InvestmentsTable";
import { Link } from "react-router-dom";

export default function Investments() {
  const { t } = useTranslation('investments');
  const { t: tc } = useTranslation('common');
  const {
    investments,
    accounts,
    isLoading,
    hasData,
    currentMonth,
    totalInvestedThisMonth,
    netInvestedAllTime,
    totalCurrentValue,
    byPlatform,
    byAssetType,
    monthlyHistory,
  } = useInvestments();

  const { formatCurrency, formatMonth } = useLocalization();

  // currentMonth is the most recent month WITH investment data, not wall-clock "today" —
  // see useInvestments.tsx. Historical/demo data would otherwise always show "this month"
  // figures for a month that has no data at all.
  const currentMonthName = formatMonth(`${currentMonth}-01`);

  const profitLoss = totalCurrentValue - netInvestedAllTime;
  const profitLossPercent = netInvestedAllTime > 0 
    ? ((profitLoss / netInvestedAllTime) * 100).toFixed(1)
    : '0';

  return (
    <DashboardLayout>
      <main className="w-full">
        {/* Page header — mobile only; desktop renders in the sticky top bar */}
        <div className="mb-6 md:hidden">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {currentMonthName}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="bg-card rounded-[18px] p-8 border border-border text-center mb-4 shadow-bento">
            <PiggyBank className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">{tc('noData')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('upload.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/my-data">
                <Button variant="gradient" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  {t('upload.title')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            <div className="flex flex-col gap-[16px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {tc('time.thisMonth')}
                    </CardTitle>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tabular-nums text-primary">
                      {formatCurrency(totalInvestedThisMonth)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('summary.totalInvested')}
                    </CardTitle>
                    <PiggyBank className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tabular-nums">
                      {formatCurrency(netInvestedAllTime)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('summary.totalValue')}
                    </CardTitle>
                    <Wallet className="w-5 h-5 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tabular-nums text-success">
                      {formatCurrency(totalCurrentValue)}
                    </div>
                    {netInvestedAllTime > 0 && (
                      <p className={`text-sm tabular-nums ${profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)} ({profitLossPercent}%)
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('byPlatform.title')}
                    </CardTitle>
                    <Building2 className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tabular-nums">
                      {Object.keys(byPlatform).length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {accounts.length} {t('accounts.title').toLowerCase()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <InvestmentAccountsManager accounts={accounts} />

              {hasData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                  <InvestmentsByPlatform data={byPlatform} />
                  <InvestmentsByAssetType data={byAssetType} />
                </div>
              )}

              {hasData && monthlyHistory.length > 0 && (
                <InvestmentsHistory data={monthlyHistory} />
              )}

              {hasData && (
                <InvestmentsTable investments={investments} />
              )}
            </div>
          </>
        )}
      </main>

      <DashboardFooter />
    </DashboardLayout>
  );
}
