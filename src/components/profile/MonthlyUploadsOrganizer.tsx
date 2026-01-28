import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useImports } from "@/hooks/useImports";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { MonthUploadSlot } from "./MonthUploadSlot";
import { usePeriods } from "@/hooks/usePeriods";
import { useLocalization } from "@/hooks/useLocalization";

const DEFAULT_MONTHS_TO_SHOW = 3;
const MONTHS_INCREMENT = 3;

export function MonthlyUploadsOrganizer() {
  const { t } = useTranslation('profile');
  const { formatMonth } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting } = useImports("CASHFLOW");
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
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const label = formatMonth(monthDate);
      slots.push({ key, label, date: monthDate });
    }
    
    return slots;
  }, [monthsToShow, formatMonth]);

  const importsByMonth = useMemo(() => {
    const grouped: Record<string, typeof imports> = {};
    
    imports.forEach((imp) => {
      const key = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(imp);
    });
    
    return grouped;
  }, [imports]);

  const handleLoadMore = () => {
    setMonthsToShow((prev) => prev + MONTHS_INCREMENT);
  };

  const handleShowLess = () => {
    setMonthsToShow((prev) => Math.max(DEFAULT_MONTHS_TO_SHOW, prev - MONTHS_INCREMENT));
  };

  const canShowLess = monthsToShow > DEFAULT_MONTHS_TO_SHOW;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <p className="text-sm text-muted-foreground">
            {t('uploads.uploadBankStatements')}
          </p>
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
      <CardHeader className="pb-4">
        <p className="text-sm text-muted-foreground">
          {t('uploads.uploadBankStatements')}
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
                imports={importsByMonth[slot.key] || []}
                onAddFiles={addFilesForMonth}
                onProcessFiles={processFilesForMonth}
                onDeleteImport={deleteImport}
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

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleLoadMore}
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            {t('uploads.loadMore')}
          </Button>
          {canShowLess && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleShowLess}
            >
              <ChevronUp className="w-4 h-4 mr-2" />
              {t('uploads.showLess')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
