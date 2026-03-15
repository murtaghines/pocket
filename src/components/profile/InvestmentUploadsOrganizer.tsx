import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useImports } from "@/hooks/useImports";
import { useMonthlyInvestmentUpload } from "@/hooks/useMonthlyInvestmentUpload";
import { MonthUploadSlot } from "./MonthUploadSlot";
import { useLocalization } from "@/hooks/useLocalization";

const DEFAULT_MONTHS_TO_SHOW = 3;
const MONTHS_INCREMENT = 3;

export function InvestmentUploadsOrganizer() {
  const { t } = useTranslation('profile');
  const { formatMonth } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting } = useImports("INVESTING");
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
      const label = formatMonth(monthDate);
      slots.push({ key, label, date: monthDate });
    }
    
    return slots;
  }, [monthsToShow, formatMonth]);

  const importsByMonth = useMemo(() => {
    const grouped: Record<string, typeof imports> = {};
    
    imports.forEach((imp) => {
      const key = `${imp.uploaded_at.substring(0, 7)}-inv`;
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
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {monthSlots.map((slot) => {
        const monthKeyForPending = slot.key.replace('-inv', '');
        return (
          <div key={slot.key} id={`upload-investment-${monthKeyForPending}`} className="transition-all duration-300">
            <MonthUploadSlot
              monthKey={slot.key}
              monthLabel={slot.label}
              monthDate={slot.date}
              imports={importsByMonth[slot.key] || []}
              onAddFiles={addFilesForMonth}
              onProcessFiles={processFilesForMonth}
              onDeleteImport={deleteImport}
              isProcessing={isProcessingMonth(monthKeyForPending)}
              hasPendingFiles={getPendingCountForMonth(monthKeyForPending) > 0}
              pendingFilesCount={getPendingCountForMonth(monthKeyForPending)}
              isDeleting={isDeleting}
            />
          </div>
        );
      })}

      <div className="flex gap-2">
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
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={handleLoadMore}
        >
          <ChevronDown className="w-4 h-4 mr-2" />
          {t('uploads.loadMore')}
        </Button>
      </div>
    </div>
  );
}
