import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useUploads } from "@/hooks/useUploads";
import { cn } from "@/lib/utils";

export function MonthStatusIndicator() {
  const { uploads } = useUploads();

  const now = new Date();
  
  const lastClosedMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, []);

  const lastClosedMonthKey = useMemo(() => {
    return `${lastClosedMonth.getFullYear()}-${String(lastClosedMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [lastClosedMonth]);

  const lastClosedMonthLabel = useMemo(() => {
    return lastClosedMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, [lastClosedMonth]);

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
              <span>Extractos</span>
            </div>
            <Badge variant={bankUploads > 0 ? "secondary" : "outline"} className="text-xs">
              {bankUploads}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Inversiones</span>
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
          Ver archivos
          <ArrowRight className="w-3 h-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
