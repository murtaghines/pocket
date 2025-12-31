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
          Inversiones
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
              invertido este mes
            </p>
            {totalCurrentValue > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Valor total: {formatCurrency(totalCurrentValue)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin inversiones registradas
          </p>
        )}
        <Link to="/investments">
          <Button variant="ghost" size="sm" className="mt-2 w-full">
            Ver inversiones
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}