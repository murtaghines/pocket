import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useUploads } from "@/hooks/useUploads";
import { useMonthlyInvestmentUpload } from "@/hooks/useMonthlyInvestmentUpload";
import { MonthUploadSlot } from "./MonthUploadSlot";

const DEFAULT_MONTHS_TO_SHOW = 6;

export function InvestmentUploadsOrganizer() {
  const { uploads, isLoading, deleteUpload, isDeleting } = useUploads();
  const { 
    pendingFilesByMonth, 
    addFilesForMonth, 
    processFilesForMonth, 
    isProcessingMonth,
    getPendingCountForMonth 
  } = useMonthlyInvestmentUpload();
  
  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS_TO_SHOW);

  const getLastClosedMonth = (): Date => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return lastMonth;
  };

  const monthSlots = useMemo(() => {
    const slots: { key: string; label: string; date: Date }[] = [];
    const lastClosed = getLastClosedMonth();
    
    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = new Date(lastClosed.getFullYear(), lastClosed.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-inv`;
      const label = monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      slots.push({ key, label, date: monthDate });
    }
    
    return slots;
  }, [monthsToShow]);

  // Filter uploads that are investment-related (stored in investments/ path)
  const investmentUploads = useMemo(() => {
    return uploads.filter(u => u.file_path?.includes('/investments/'));
  }, [uploads]);

  const uploadsByMonth = useMemo(() => {
    const grouped: Record<string, typeof investmentUploads> = {};
    
    investmentUploads.forEach((upload) => {
      if (upload.target_month) {
        // Extract YYYY-MM directly from the string to avoid timezone issues
        const key = `${upload.target_month.substring(0, 7)}-inv`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(upload);
      }
    });
    
    return grouped;
  }, [investmentUploads]);

  const handleLoadMore = () => {
    setMonthsToShow((prev) => prev + 3);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Inversiones por Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Inversiones por Mes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Archivos de plataformas de inversión y ahorro
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {monthSlots.map((slot) => {
            const monthKeyForPending = slot.key.replace('-inv', '');
            return (
              <MonthUploadSlot
                key={slot.key}
                monthKey={slot.key}
                monthLabel={slot.label}
                monthDate={slot.date}
                uploads={uploadsByMonth[slot.key] || []}
                onAddFiles={addFilesForMonth}
                onProcessFiles={processFilesForMonth}
                onDeleteUpload={deleteUpload}
                isProcessing={isProcessingMonth(monthKeyForPending)}
                hasPendingFiles={getPendingCountForMonth(monthKeyForPending) > 0}
                pendingFilesCount={getPendingCountForMonth(monthKeyForPending)}
                isDeleting={isDeleting}
              />
            );
          })}
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleLoadMore}
        >
          <ChevronDown className="w-4 h-4 mr-2" />
          Cargar meses anteriores
        </Button>
      </CardContent>
    </Card>
  );
}
