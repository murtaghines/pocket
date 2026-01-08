import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useUploads } from "@/hooks/useUploads";
import { useMonthlyInvestmentUpload } from "@/hooks/useMonthlyInvestmentUpload";
import { MonthUploadSlot } from "./MonthUploadSlot";
import { useLocalization } from "@/hooks/useLocalization";

const DEFAULT_MONTHS_TO_SHOW = 6;

export function InvestmentUploadsOrganizer() {
  // Only fetch INVESTING uploads
  const { uploads, isLoading, deleteUpload, isDeleting } = useUploads("INVESTING");
  const { 
    pendingFilesByMonth, 
    addFilesForMonth, 
    processFilesForMonth, 
    isProcessingMonth,
    getPendingCountForMonth 
  } = useMonthlyInvestmentUpload();
  const { t, language } = useLocalization();
  
  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS_TO_SHOW);

  const locale = language === 'es' ? 'es-ES' :
                 language === 'pt' ? 'pt-BR' : 'en-US';

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
      const label = monthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      slots.push({ key, label, date: monthDate });
    }
    
    return slots;
  }, [monthsToShow, locale]);

  const uploadsByMonth = useMemo(() => {
    const grouped: Record<string, typeof uploads> = {};
    
    uploads.forEach((upload) => {
      if (upload.target_month) {
        // Extract YYYY-MM directly from the string to avoid timezone issues
        const key = `${upload.target_month.substring(0, 7)}-inv`;
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
            <TrendingUp className="w-5 h-5" />
            {t('profile.investments_by_month')}
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
          {t('profile.investments_by_month')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('profile.investment_platform_files')}
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
          {t('common.load_more')}
        </Button>
      </CardContent>
    </Card>
  );
}
