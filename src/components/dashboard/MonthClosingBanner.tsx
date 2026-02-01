import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, FileText, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useImports, Import } from "@/hooks/useImports";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const BANNER_SHOW_UNTIL_DAY = 7;

export function MonthClosingBanner() {
  const { t, i18n } = useTranslation('dashboard');
  const { imports: cashflowImports } = useImports("CASHFLOW");
  const { imports: investingImports } = useImports("INVESTING");
  const [isDismissed, setIsDismissed] = useState(false);

  const now = new Date();
  const currentDay = now.getDate();
  
  const lastClosedMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, []);

  const lastClosedMonthKey = useMemo(() => {
    return `${lastClosedMonth.getFullYear()}-${String(lastClosedMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [lastClosedMonth]);

  const lastClosedMonthLabel = useMemo(() => {
    return lastClosedMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  }, [lastClosedMonth, i18n.language]);

  const countImportsForMonth = (imports: Import[], monthKey: string) => {
    return imports.filter((imp) => {
      const targetMonth = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
      return targetMonth === monthKey && imp.status === 'NORMALIZED';
    }).length;
  };

  const { bankUploads, investmentUploads } = useMemo(() => {
    return {
      bankUploads: countImportsForMonth(cashflowImports, lastClosedMonthKey),
      investmentUploads: countImportsForMonth(investingImports, lastClosedMonthKey)
    };
  }, [cashflowImports, investingImports, lastClosedMonthKey]);

  useEffect(() => {
    const dismissedKey = `monthClosingDismissed_${lastClosedMonthKey}`;
    const wasDismissed = localStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setIsDismissed(true);
    }
  }, [lastClosedMonthKey]);

  const handleDismiss = () => {
    const dismissedKey = `monthClosingDismissed_${lastClosedMonthKey}`;
    localStorage.setItem(dismissedKey, 'true');
    setIsDismissed(true);
  };

  if (isDismissed || currentDay > BANNER_SHOW_UNTIL_DAY) {
    return null;
  }

  const isComplete = bankUploads > 0 && investmentUploads > 0;

  return (
    <Card variant="bento" className="mb-6 border-primary/20 bg-primary/5 animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-base capitalize">
                  {t('monthClosing.readyToClose', { month: lastClosedMonthLabel })}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('monthClosing.uploadPrompt')}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('monthClosing.bankStatements')}:</span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    bankUploads > 0 
                      ? "bg-success/10 text-success" 
                      : "bg-warning/10 text-warning"
                  )}>
                    {bankUploads}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('monthClosing.investments')}:</span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    investmentUploads > 0 
                      ? "bg-success/10 text-success" 
                      : "bg-warning/10 text-warning"
                  )}>
                    {investmentUploads}
                  </span>
                </div>
              </div>

              <Link to="/profile">
                <Button size="sm" className="mt-2 rounded-full">
                  {t('monthClosing.goToUpload')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
