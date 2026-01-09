import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, FolderOpen } from "lucide-react";
import { useUploads } from "@/hooks/useUploads";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { MonthUploadSlot } from "./MonthUploadSlot";
import { useLocalization } from "@/hooks/useLocalization";
import { usePeriods } from "@/hooks/usePeriods";

const DEFAULT_MONTHS_TO_SHOW = 6;

export function MonthlyUploadsOrganizer() {
  // Only fetch CASHFLOW uploads
  const { uploads, isLoading, deleteUpload, isDeleting } = useUploads("CASHFLOW");
  const { 
    pendingFilesByMonth, 
    addFilesForMonth, 
    processFilesForMonth, 
    isProcessingMonth,
    getPendingCountForMonth 
  } = useMonthlyFileUpload();
  const { 
    periods, 
    closePeriod, 
    reopenPeriod, 
    isClosing, 
    isReopening,
    getPeriodByMonthKey 
  } = usePeriods("CASHFLOW");
  const { t, language } = useLocalization();
  
  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS_TO_SHOW);

  const locale = language === 'es' ? 'es-ES' :
                 language === 'pt' ? 'pt-BR' : 'en-US';

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
      const label = monthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      slots.push({ key, label, date: monthDate });
    }
    
    return slots;
  }, [monthsToShow, locale]);

  // Group uploads by target_month
  const uploadsByMonth = useMemo(() => {
    const grouped: Record<string, typeof uploads> = {};
    
    uploads.forEach((upload) => {
      if (upload.target_month) {
        // Extract YYYY-MM directly from the string to avoid timezone issues
        const key = upload.target_month.substring(0, 7);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(upload);
      }
    });
    
    return grouped;
  }, [uploads]);

  const handleLoadMore = () => {
    setMonthsToShow((prev) => prev + 3);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            {t('profile.files_by_month')}
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
          {t('profile.files_by_month')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('profile.organize_bank_statements')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {monthSlots.map((slot) => {
            const period = getPeriodByMonthKey(slot.key, "CASHFLOW");
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
                isProcessing={isProcessingMonth(slot.key)}
                hasPendingFiles={getPendingCountForMonth(slot.key) > 0}
                pendingFilesCount={getPendingCountForMonth(slot.key)}
                isDeleting={isDeleting}
                period={period}
                onClosePeriod={closePeriod}
                onReopenPeriod={reopenPeriod}
                isClosingPeriod={isClosing}
                isReopeningPeriod={isReopening}
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
          {t('common.load_more')}
        </Button>
      </CardContent>
    </Card>
  );
}
