import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
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
    totalInvestedThisMonth,
    netInvestedAllTime,
    totalCurrentValue,
    byPlatform,
    byAssetType,
    monthlyHistory,
  } = useInvestments();

  const { formatCurrency, formatMonth } = useLocalization();

  const currentMonthName = formatMonth(new Date());

  const profitLoss = totalCurrentValue - netInvestedAllTime;
  const profitLossPercent = netInvestedAllTime > 0 
    ? ((profitLoss / netInvestedAllTime) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <MobileBottomNav />

      <main className="container px-4 md:px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {currentMonthName}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="text-center py-12 mb-8">
            <PiggyBank className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">{tc('noData')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('upload.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/profile">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="animate-fade-in">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {tc('time.thisMonth')}
                  </CardTitle>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(totalInvestedThisMonth)}
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('summary.totalInvested')}
                  </CardTitle>
                  <PiggyBank className="w-5 h-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(netInvestedAllTime)}
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('summary.totalValue')}
                  </CardTitle>
                  <Wallet className="w-5 h-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalCurrentValue)}
                  </div>
                  {netInvestedAllTime > 0 && (
                    <p className={`text-sm ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)} ({profitLossPercent}%)
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('byPlatform.title')}
                  </CardTitle>
                  <Building2 className="w-5 h-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(byPlatform).length}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {accounts.length} {t('accounts.title').toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6">
              <InvestmentAccountsManager accounts={accounts} />
            </div>

            {hasData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <InvestmentsByPlatform data={byPlatform} />
                <InvestmentsByAssetType data={byAssetType} />
              </div>
            )}

            {hasData && monthlyHistory.length > 0 && (
              <div className="mb-6">
                <InvestmentsHistory data={monthlyHistory} />
              </div>
            )}

            {hasData && (
              <InvestmentsTable investments={investments} />
            )}
          </>
        )}
      </main>

      <footer className="border-t mt-12">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            fint
          </p>
        </div>
      </footer>
    </div>
  );
}
