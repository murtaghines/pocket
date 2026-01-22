import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useImports } from "@/hooks/useImports";
import { useMonthlyInvestmentUpload } from "@/hooks/useMonthlyInvestmentUpload";
import { MonthUploadSlot } from "./MonthUploadSlot";
const DEFAULT_MONTHS_TO_SHOW = 6;

export function InvestmentUploadsOrganizer() {
  const { t } = useTranslation('profile');
  // Use imports instead of uploads (unified system)
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
      const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      slots.push({ key, label, date: monthDate });
    }
    
    return slots;
  }, [monthsToShow]);

  const importsByMonth = useMemo(() => {
    const grouped: Record<string, typeof imports> = {};
    
    imports.forEach((imp) => {
      // Extract YYYY-MM from uploaded_at
      const key = `${imp.uploaded_at.substring(0, 7)}-inv`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(imp);
    });
    
    return grouped;
  }, [imports]);

  const handleLoadMore = () => {
    setMonthsToShow((prev) => prev + 3);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <p className="text-sm text-muted-foreground">
            {t('uploads.uploadStatements')}
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
          {t('uploads.uploadStatements')}
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
                imports={importsByMonth[slot.key] || []}
                onAddFiles={addFilesForMonth}
                onProcessFiles={processFilesForMonth}
                onDeleteImport={deleteImport}
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
          Load More
        </Button>
      </CardContent>
    </Card>
  );
}
