import { useState, useMemo } from "react";
import { Bell, FileText, TrendingUp, Upload, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "react-router-dom";
import { useImports, Import } from "@/hooks/useImports";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const BANNER_SHOW_UNTIL_DAY = 10;

interface NotificationBellProps {
  variant?: 'light' | 'dark';
}

export function NotificationBell({ variant = 'light' }: NotificationBellProps) {
  const { t, i18n } = useTranslation('dashboard');
  const { imports: cashflowImports } = useImports("CASHFLOW");
  const { imports: investingImports } = useImports("INVESTING");
  const [isDismissed, setIsDismissed] = useState(() => {
    const now = new Date();
    const lastClosedMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastClosedMonthKey = `${lastClosedMonth.getFullYear()}-${String(lastClosedMonth.getMonth() + 1).padStart(2, '0')}`;
    const dismissedKey = `monthClosingDismissed_${lastClosedMonthKey}`;
    return localStorage.getItem(dismissedKey) === 'true';
  });

  const now = new Date();
  const currentDay = now.getDate();
  
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

  const handleDismiss = () => {
    const dismissedKey = `monthClosingDismissed_${lastClosedMonthKey}`;
    localStorage.setItem(dismissedKey, 'true');
    setIsDismissed(true);
  };

  // Check if there's an active notification
  const isComplete = bankUploads > 0;
  const hasNotification = !isDismissed && currentDay <= BANNER_SHOW_UNTIL_DAY && !isComplete;

  const isDark = variant === 'dark';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "relative rounded-full",
            isDark ? "text-white hover:bg-white/10" : "hover:bg-primary/10 text-primary"
          )}
        >
          <Bell className="w-5 h-5" />
          {hasNotification && (
            <span className={cn(
              "absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2",
              isDark ? "border-[#171717]" : "border-background"
            )} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">{t('notifications.title', 'Notifications')}</h3>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {hasNotification ? (
            <div className="p-4 border-b border-border/50 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm capitalize">
                      {t('notifications.uploadReminder', { month: lastClosedMonthLabel })}
                    </h4>
                    <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                      {t('notifications.new')}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('notifications.uploadDescription')}
                  </p>

                  {/* Status badges */}
                  <div className="flex items-center gap-3 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className={cn(
                        "font-medium",
                        bankUploads > 0 ? "text-success" : "text-warning"
                      )}>
                        {bankUploads}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <span className={cn(
                        "font-medium",
                        investmentUploads > 0 ? "text-success" : "text-warning"
                      )}>
                        {investmentUploads}
                      </span>
                    </div>
                  </div>

                  <Link to="/profile" className="inline-block">
                    <Button size="sm" className="rounded-full gap-1.5 h-7 text-xs">
                      {t('monthClosing.goToUpload')}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="shrink-0 text-muted-foreground hover:text-foreground rounded-full h-6 w-6"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('notifications.empty', 'No notifications')}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
