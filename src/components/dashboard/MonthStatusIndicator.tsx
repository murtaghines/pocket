import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useImports, Import } from "@/hooks/useImports";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/hooks/useLocalization";

export function MonthStatusIndicator() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { formatMonth } = useLocalization();
  const { imports: cashflowImports, isLoading: cashflowLoading } = useImports("CASHFLOW");
  const { imports: investingImports, isLoading: investingLoading } = useImports("INVESTING");

  const now = new Date();
  
  const lastClosedMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, []);

  const lastClosedMonthKey = useMemo(() => {
    return `${lastClosedMonth.getFullYear()}-${String(lastClosedMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [lastClosedMonth]);

  const lastClosedMonthLabel = useMemo(() => {
    return formatMonth(lastClosedMonth);
  }, [lastClosedMonth, formatMonth]);

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

  const status = useMemo(() => {
    if (bankUploads > 0 && investmentUploads > 0) return 'complete';
    if (bankUploads > 0 || investmentUploads > 0) return 'partial';
    return 'empty';
  }, [bankUploads, investmentUploads]);

  const statusStyles = {
    complete: 'border-success/30',
    partial: 'border-warning/30',
    empty: 'border-border/30',
  };

  const statusIcon = {
    complete: <CheckCircle2 className="w-4 h-4 text-success" />,
    partial: <AlertCircle className="w-4 h-4 text-warning" />,
    empty: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
  };

  if (cashflowLoading || investingLoading) {
    return (
      <Card variant="bento" className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <CardContent className="p-5 flex items-center justify-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className={cn("transition-all", statusStyles[status])} style={{ animationDelay: '400ms' }}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {status === 'complete' ? <CheckCircle2 className="w-5 h-5 text-primary" /> : status === 'partial' ? <AlertCircle className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs rounded-full",
              status === 'complete' && "bg-success/10 text-success border-success/30",
              status === 'partial' && "bg-warning/10 text-warning border-warning/30",
              status === 'empty' && "bg-muted text-muted-foreground"
            )}
          >
            {status === 'complete' ? 'Complete' : status === 'partial' ? 'Partial' : 'Empty'}
          </Badge>
        </div>

        <p className="text-sm font-medium text-muted-foreground mb-1">
          {lastClosedMonthLabel}
        </p>
        
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              <span>{t('upload.title')}</span>
            </div>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              bankUploads > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}>
              {bankUploads}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('investments.title')}</span>
            </div>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              investmentUploads > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}>
              {investmentUploads}
            </span>
          </div>
        </div>

        <Link 
          to="/profile" 
          className="flex items-center justify-center gap-1 text-xs text-primary hover:underline mt-4 pt-3 border-t border-border/50"
        >
          {tc('viewAll')}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
