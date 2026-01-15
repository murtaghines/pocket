import { Header } from "@/components/layout/Header";
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

  // Calculate profit/loss
  const profitLoss = totalCurrentValue - netInvestedAllTime;
  const profitLossPercent = netInvestedAllTime > 0 
    ? ((profitLoss / netInvestedAllTime) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Investments
          </h2>
          <p className="text-muted-foreground mt-1">
            Track your investment portfolio • {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !hasData && (
          <div className="text-center py-12 mb-8">
            <PiggyBank className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No investment data</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your investment statements or add accounts manually
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/profile">
                <Button variant="gradient" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  Go to Profile to upload
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Dashboard with Data */}
        {!isLoading && (
          <>
            {/* Section 1: KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="animate-fade-in">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    This Month
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
                    Total Invested
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
                    Current Value
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
                    Platforms
                  </CardTitle>
                  <Building2 className="w-5 h-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(byPlatform).length}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {accounts.length} active accounts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Accounts Manager */}
            <div className="mb-8">
              <InvestmentAccountsManager accounts={accounts} />
            </div>

            {/* Section 3: Platform & Asset Distribution */}
            {hasData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <InvestmentsByPlatform data={byPlatform} />
                <InvestmentsByAssetType data={byAssetType} />
              </div>
            )}

            {/* Section 4: Monthly History Chart */}
            {hasData && monthlyHistory.length > 0 && (
              <div className="mb-8">
                <InvestmentsHistory data={monthlyHistory} />
              </div>
            )}

            {/* Section 5: Transactions Table */}
            {hasData && (
              <InvestmentsTable investments={investments} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            fint • Personal finance control
          </p>
        </div>
      </footer>
    </div>
  );
}
