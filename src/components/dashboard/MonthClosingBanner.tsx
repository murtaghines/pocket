import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, FileText, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useImports, Import } from "@/hooks/useImports";

const BANNER_SHOW_UNTIL_DAY = 7; // Show banner from day 1 to day 7 of each month

export function MonthClosingBanner() {
  const { imports: cashflowImports } = useImports("CASHFLOW");
  const { imports: investingImports } = useImports("INVESTING");
  const [isDismissed, setIsDismissed] = useState(false);

  const now = new Date();
  const currentDay = now.getDate();
  
  // The last closed month
  const lastClosedMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, []);

  const lastClosedMonthKey = useMemo(() => {
    return `${lastClosedMonth.getFullYear()}-${String(lastClosedMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [lastClosedMonth]);

  const lastClosedMonthLabel = useMemo(() => {
    return lastClosedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [lastClosedMonth]);

  const countImportsForMonth = (imports: Import[], monthKey: string) => {
    return imports.filter((imp) => {
      const targetMonth = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
      // Only count NORMALIZED imports as successful
      return targetMonth === monthKey && imp.status === 'NORMALIZED';
    }).length;
  };

  // Count uploads for last closed month
  const { bankUploads, investmentUploads } = useMemo(() => {
    return {
      bankUploads: countImportsForMonth(cashflowImports, lastClosedMonthKey),
      investmentUploads: countImportsForMonth(investingImports, lastClosedMonthKey)
    };
  }, [cashflowImports, investingImports, lastClosedMonthKey]);

  // Check local storage for dismissal
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

  // Don't show if dismissed or past day 7
  if (isDismissed || currentDay > BANNER_SHOW_UNTIL_DAY) {
    return null;
  }

  const isComplete = bankUploads > 0 && investmentUploads > 0;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 animate-fade-in">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-2 rounded-full bg-primary/10">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg capitalize">
                  {lastClosedMonthLabel} is ready to close!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload your bank statements and investments to complete the month's analysis.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Bank statements:</span>
                  <Badge variant={bankUploads > 0 ? "default" : "outline"} className={bankUploads === 0 ? "text-warning border-warning" : ""}>
                    {bankUploads} file{bankUploads !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Investments:</span>
                  <Badge variant={investmentUploads > 0 ? "default" : "outline"} className={investmentUploads === 0 ? "text-warning border-warning" : ""}>
                    {investmentUploads} file{investmentUploads !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              <Link to="/profile">
                <Button variant="gradient" size="sm" className="mt-2">
                  Go to upload files
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
