import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInvestments } from "@/hooks/useInvestments";
import { useLocalization } from "@/hooks/useLocalization";
import { PiggyBank, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function InvestmentSummaryCard() {
  const { totalInvestedThisMonth, totalCurrentValue, hasData } = useInvestments();
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();

  return (
    <Card variant="bento" className="">
      <CardContent className="p-5">
        {/* Icon badge - blue diffused */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <PiggyBank className="w-5 h-5 text-primary" />
        </div>

        {/* Label */}
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {t('investments.title')}
        </p>

        {hasData ? (
          <>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
              {formatCurrency(totalInvestedThisMonth)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('investments.investedThisMonth')}
            </p>
            {totalCurrentValue > 0 && (
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                  {t('investments.totalValue')}: {formatCurrency(totalCurrentValue)}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('investments.noInvestments')}
          </p>
        )}
        
        <Link to="/investments" className="block mt-4">
          <Button variant="ghost" size="sm" className="w-full rounded-xl text-primary hover:bg-primary/5">
            {t('investments.viewInvestments')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
