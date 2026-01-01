import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, FileText, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useUploads } from "@/hooks/useUploads";

const BANNER_SHOW_UNTIL_DAY = 7; // Show banner from day 1 to day 7 of each month

export function MonthClosingBanner() {
  const { uploads } = useUploads();
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
    return lastClosedMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, [lastClosedMonth]);

  // Count uploads for last closed month
  const { bankUploads, investmentUploads } = useMemo(() => {
    let bank = 0;
    let investment = 0;
    
    uploads.forEach((upload) => {
      if (upload.target_month) {
        // Extract YYYY-MM directly from the string to avoid timezone issues
        const key = upload.target_month.substring(0, 7);
        if (key === lastClosedMonthKey) {
          if (upload.file_path?.includes('/investments/')) {
            investment++;
          } else {
            bank++;
          }
        }
      }
    });
    
    return { bankUploads: bank, investmentUploads: investment };
  }, [uploads, lastClosedMonthKey]);

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
                  ¡{lastClosedMonthLabel} está listo para cerrar!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sube tus extractos bancarios e inversiones para completar el análisis del mes.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Extractos bancarios:</span>
                  <Badge variant={bankUploads > 0 ? "default" : "outline"} className={bankUploads === 0 ? "text-warning border-warning" : ""}>
                    {bankUploads} archivo{bankUploads !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Inversiones:</span>
                  <Badge variant={investmentUploads > 0 ? "default" : "outline"} className={investmentUploads === 0 ? "text-warning border-warning" : ""}>
                    {investmentUploads} archivo{investmentUploads !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              <Link to="/profile">
                <Button variant="gradient" size="sm" className="mt-2">
                  Ir a subir archivos
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
