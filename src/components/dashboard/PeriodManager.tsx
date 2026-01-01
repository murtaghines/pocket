import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePeriods } from "@/hooks/usePeriods";
import { useLocalization } from "@/hooks/useLocalization";
import { 
  CalendarCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PeriodManager() {
  const { periods, isLoading, closePeriod, reopenPeriod, isClosing, isReopening } = usePeriods();
  const { formatMonth } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);

  // Filter only CASHFLOW periods
  const cashflowPeriods = periods.filter(p => p.domain === "CASHFLOW");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CLOSED": return <Lock className="w-4 h-4" />;
      case "READY_TO_CLOSE": return <AlertTriangle className="w-4 h-4" />;
      default: return <Unlock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CLOSED":
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Cerrado</Badge>;
      case "READY_TO_CLOSE":
        return <Badge variant="secondary" className="bg-warning/10 text-warning">Listo para cerrar</Badge>;
      default:
        return <Badge variant="secondary" className="bg-success/10 text-success">Abierto</Badge>;
    }
  };

  const formatPeriodMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            Períodos Contables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cashflowPeriods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            Períodos Contables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay períodos aún</p>
            <p className="text-xs mt-1">Los períodos se crean automáticamente al importar datos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5" />
                Períodos Contables
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{cashflowPeriods.length}</Badge>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {cashflowPeriods.map((period) => (
                <div
                  key={period.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    period.status === "CLOSED" && "bg-muted/30 border-muted",
                    period.status === "READY_TO_CLOSE" && "bg-warning/5 border-warning/30",
                    period.status === "OPEN" && "bg-background border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      period.status === "CLOSED" && "bg-muted",
                      period.status === "READY_TO_CLOSE" && "bg-warning/10",
                      period.status === "OPEN" && "bg-success/10"
                    )}>
                      {getStatusIcon(period.status)}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{formatPeriodMonth(period.month_key)}</p>
                      {period.closed_at && (
                        <p className="text-xs text-muted-foreground">
                          Cerrado el {new Date(period.closed_at).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(period.status)}
                    
                    {period.status === "OPEN" || period.status === "READY_TO_CLOSE" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isClosing}
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Cerrar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Cerrar período?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Al cerrar el período de {formatPeriodMonth(period.month_key)}, 
                              las transacciones de ese mes quedarán bloqueadas. 
                              Podrás reabrirlo si necesitas hacer cambios.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => closePeriod(period.id)}>
                              Cerrar período
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={isReopening}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            Reabrir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Reabrir período?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Al reabrir el período de {formatPeriodMonth(period.month_key)}, 
                              podrás volver a editar las transacciones de ese mes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => reopenPeriod(period.id)}>
                              Reabrir período
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
