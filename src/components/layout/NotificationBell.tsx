import { useState, useMemo } from "react";
import { Bell, FileText, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { useImports, Import } from "@/hooks/useImports";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const BANNER_SHOW_UNTIL_DAY = 10;

interface NotificationBellProps {
  variant?: 'light' | 'dark';
}

export function NotificationBell({ variant = 'light' }: NotificationBellProps) {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { imports: cashflowImports } = useImports("CASHFLOW");
  const { imports: investingImports } = useImports("INVESTING");
  
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

  // Separate dismissed state for each notification type
  const [dismissedBank, setDismissedBank] = useState(() => {
    const dismissedKey = `bankDismissed_${lastClosedMonthKey}`;
    return localStorage.getItem(dismissedKey) === 'true';
  });
  
  const [dismissedInvestment, setDismissedInvestment] = useState(() => {
    const dismissedKey = `investmentDismissed_${lastClosedMonthKey}`;
    return localStorage.getItem(dismissedKey) === 'true';
  });

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

  const handleDismissBank = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dismissedKey = `bankDismissed_${lastClosedMonthKey}`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissedBank(true);
  };

  const handleDismissInvestment = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dismissedKey = `investmentDismissed_${lastClosedMonthKey}`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissedInvestment(true);
  };

  const handleNavigateToProfile = () => {
    navigate('/profile');
  };

  // Check active notifications
  const showBankNotification = !dismissedBank && currentDay <= BANNER_SHOW_UNTIL_DAY && bankUploads === 0;
  const showInvestmentNotification = !dismissedInvestment && currentDay <= BANNER_SHOW_UNTIL_DAY && investmentUploads === 0;
  const hasNotification = showBankNotification || showInvestmentNotification;

  const isDark = variant === 'dark';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "relative rounded-full w-9 h-9",
            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-primary text-white hover:bg-primary/90"
          )}
        >
          <Bell className="w-4 h-4" />
          {hasNotification && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-xl overflow-hidden bg-white border-gray-200 shadow-lg">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900">{t('notifications.title', 'Notifications')}</h3>
        </div>
        
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
          {/* Bank Statements Notification */}
          {showBankNotification && (
            <div 
              onClick={handleNavigateToProfile}
              className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-medium text-sm text-gray-900 capitalize">
                    {t('notifications.bankReminder', { month: lastClosedMonthLabel, defaultValue: `Upload ${lastClosedMonthLabel} bank statements` })}
                  </h4>
                  <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-medium">
                    {t('notifications.new')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('notifications.bankDescription', 'Add your bank statements to keep your analysis up to date.')}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismissBank}
                className="shrink-0 text-gray-400 hover:text-gray-600 rounded-full h-6 w-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Investment Statements Notification */}
          {showInvestmentNotification && (
            <div 
              onClick={handleNavigateToProfile}
              className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-medium text-sm text-gray-900 capitalize">
                    {t('notifications.investmentReminder', { month: lastClosedMonthLabel, defaultValue: `Upload ${lastClosedMonthLabel} investments` })}
                  </h4>
                  <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-medium">
                    {t('notifications.new')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('notifications.investmentDescription', 'Add your investment statements to track your portfolio.')}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismissInvestment}
                className="shrink-0 text-gray-400 hover:text-gray-600 rounded-full h-6 w-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!showBankNotification && !showInvestmentNotification && (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {t('notifications.empty', 'No notifications')}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
