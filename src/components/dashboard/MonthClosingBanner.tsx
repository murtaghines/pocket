import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Bell, FileText, TrendingUp, ArrowRight, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useImports, Import } from "@/hooks/useImports";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const BANNER_SHOW_UNTIL_DAY = 10; // Show notification until day 10 of month

export function MonthClosingBanner() {
  const { t, i18n } = useTranslation('dashboard');
  const { imports: cashflowImports } = useImports("CASHFLOW");
  const { imports: investingImports } = useImports("INVESTING");
  const [isDismissed, setIsDismissed] = useState(false);

  const now = new Date();
  const currentDay = now.getDate();
  
  // Get last month's info
  const lastClosedMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, []);

  const lastClosedMonthKey = useMemo(() => {
    return `${lastClosedMonth.getFullYear()}-${String(lastClosedMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [lastClosedMonth]);

  const lastClosedMonthLabel = useMemo(() => {
    return lastClosedMonth.toLocaleDateString(i18n.language, { month: 'long' });
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

  // Don't show if dismissed, after day 10, or if already uploaded files
  const isComplete = bankUploads > 0;
  if (isDismissed || currentDay > BANNER_SHOW_UNTIL_DAY || isComplete) {
    return null;
  }

  return (
    <Card variant="bento" className="mb-6 overflow-hidden animate-fade-in">
      <div className="flex">
        {/* Blue accent bar on left */}
        <div className="w-1 bg-primary flex-shrink-0" />
        
        <div className="flex-1 p-4 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {/* Notification icon */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm md:text-base capitalize">
                    {t('notifications.uploadReminder', { month: lastClosedMonthLabel })}
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {t('notifications.new')}
                  </span>
                </div>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3">
                  {t('notifications.uploadDescription')}
                </p>

                {/* Status badges */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('monthClosing.bankStatements')}:</span>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      bankUploads > 0 
                        ? "bg-success/10 text-success" 
                        : "bg-warning/10 text-warning"
                    )}>
                      {bankUploads}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('monthClosing.investments')}:</span>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      investmentUploads > 0 
                        ? "bg-success/10 text-success" 
                        : "bg-warning/10 text-warning"
                    )}>
                      {investmentUploads}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <Link to="/profile">
                  <Button size="sm" className="rounded-full gap-2">
                    <Upload className="w-4 h-4" />
                    {t('monthClosing.goToUpload')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Dismiss button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground rounded-full h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
