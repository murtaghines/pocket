import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInvestments } from "@/hooks/useInvestments";
import { PiggyBank, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function InvestmentSummaryCard() {
  const { totalInvestedThisMonth, totalCurrentValue, hasData } = useInvestments();

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Investments
        </CardTitle>
        <PiggyBank className="w-5 h-5 text-purple-500" />
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(totalInvestedThisMonth)}
            </div>
            <p className="text-sm text-muted-foreground">
              invested this month
            </p>
            {totalCurrentValue > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Total value: {formatCurrency(totalCurrentValue)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No investments recorded
          </p>
        )}
        <Link to="/investments">
          <Button variant="ghost" size="sm" className="mt-2 w-full">
            View investments
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}