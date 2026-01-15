import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useImports, Import } from "@/hooks/useImports";
import { cn } from "@/lib/utils";

export function MonthStatusIndicator() {
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
    return lastClosedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [lastClosedMonth]);

  const countImportsForMonth = (imports: Import[], monthKey: string) => {
    return imports.filter((imp) => {
      const targetMonth = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
      // Only count NORMALIZED imports as successful
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

  const statusColor = {
    complete: 'border-success/30 bg-success/5',
    partial: 'border-warning/30 bg-warning/5',
    empty: 'border-muted',
  };

  const statusIcon = {
    complete: <CheckCircle2 className="w-4 h-4 text-success" />,
    partial: <AlertCircle className="w-4 h-4 text-warning" />,
    empty: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
  };

  if (cashflowLoading || investingLoading) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all", statusColor[status])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium capitalize text-sm">{lastClosedMonthLabel}</h4>
          {statusIcon[status]}
        </div>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              <span>Statements</span>
            </div>
            <Badge variant={bankUploads > 0 ? "secondary" : "outline"} className="text-xs">
              {bankUploads}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Investments</span>
            </div>
            <Badge variant={investmentUploads > 0 ? "secondary" : "outline"} className="text-xs">
              {investmentUploads}
            </Badge>
          </div>
        </div>

        <Link 
          to="/profile" 
          className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
        >
          View files
          <ArrowRight className="w-3 h-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
