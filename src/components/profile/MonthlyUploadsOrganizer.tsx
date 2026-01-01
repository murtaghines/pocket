import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, ChevronDown, FolderOpen } from "lucide-react";
import { useUploads } from "@/hooks/useUploads";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { MonthUploadSlot } from "./MonthUploadSlot";

const DEFAULT_MONTHS_TO_SHOW = 6;

export function MonthlyUploadsOrganizer() {
  const { uploads, isLoading, deleteUpload, isDeleting } = useUploads();
  const { 
    pendingFilesByMonth, 
    addFilesForMonth, 
    processFilesForMonth, 
    isProcessingMonth,
    getPendingCountForMonth 
  } = useMonthlyFileUpload();
  
  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS_TO_SHOW);

  // Calculate the last closed month (if today is Jan 1, last closed is December)
  const getLastClosedMonth = (): Date => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return lastMonth;
  };

  // Generate month slots from the last closed month going back
  const monthSlots = useMemo(() => {
    const slots: { key: string; label: string; date: Date }[] = [];
    const lastClosed = getLastClosedMonth();
    
    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = new Date(lastClosed.getFullYear(), lastClosed.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const label = monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      slots.push({ key, label, date: monthDate });
    }
    
    return slots;
  }, [monthsToShow]);

  // Group uploads by target_month
  const uploadsByMonth = useMemo(() => {
    const grouped: Record<string, typeof uploads> = {};
    
    uploads.forEach((upload) => {
      if (upload.target_month) {
        const date = new Date(upload.target_month);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(upload);
      }
    });
    
    return grouped;
  }, [uploads]);

  const handleLoadMore = () => {
    setMonthsToShow((prev) => prev + 6);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Archivos por Mes
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
          <FolderOpen className="w-5 h-5" />
          Archivos por Mes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Organiza tus extractos bancarios por mes contable
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="max-h-[500px] pr-2">
          <div className="space-y-3">
            {monthSlots.map((slot) => (
              <MonthUploadSlot
                key={slot.key}
                monthKey={slot.key}
                monthLabel={slot.label}
                monthDate={slot.date}
                uploads={uploadsByMonth[slot.key] || []}
                onAddFiles={addFilesForMonth}
                onProcessFiles={processFilesForMonth}
                onDeleteUpload={deleteUpload}
                isProcessing={isProcessingMonth(slot.key)}
                hasPendingFiles={getPendingCountForMonth(slot.key) > 0}
                pendingFilesCount={getPendingCountForMonth(slot.key)}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        </ScrollArea>

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
