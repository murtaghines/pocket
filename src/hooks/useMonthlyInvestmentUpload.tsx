import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile } from "@/lib/excelParser";
import { extractPdfText, getMonthKey } from "@/lib/fileExtract";
import type {
  SmartImportPreview,
  SmartImportStats,
} from "@/components/imports/investments/InvestmentPreviewDialog";

interface PendingFile {
  id: string;
  name: string;
  size: number;
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
  transactionsCount?: number;
}

type PendingFilesByMonth = Record<string, PendingFile[]>;

export function useMonthlyInvestmentUpload() {
  const [pendingFilesByMonth, setPendingFilesByMonth] = useState<PendingFilesByMonth>({});
  const [previewData, setPreviewData] = useState<SmartImportPreview | null>(null);
  const [previewStats, setPreviewStats] = useState<SmartImportStats | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingImportId, setPendingImportId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [saveExchangeRates, setSaveExchangeRates] = useState(true);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation('imports');

  const addFilesForMonth = useCallback((files: File[], targetMonth: Date): PendingFile[] => {
    const monthKey = getMonthKey(targetMonth);
    const newFiles: PendingFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      file,
      status: "pending" as const,
    }));

    setPendingFilesByMonth((prev) => ({
      ...prev,
      [monthKey]: [...(prev[monthKey] || []), ...newFiles],
    }));
    return newFiles;
  }, []);

  const removeFileFromMonth = useCallback((monthKey: string, fileId: string) => {
    setPendingFilesByMonth((prev) => ({
      ...prev,
      [monthKey]: (prev[monthKey] || []).filter((f) => f.id !== fileId),
    }));
  }, []);

  const extractFileContent = async (file: File): Promise<string> => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      return await file.text();
    }

    if (extension === "xlsx") {
      return await parseExcelFile(file);
    }

    if (extension === "pdf") {
      const result = await extractPdfText(file, { reconstructTables: false });
      if (result.truncated) {
        toast({
          title: t('pdf.partiallyProcessed'),
          description: t('pdf.partiallyProcessedDescription', { processed: result.processedPages, total: result.totalPages }),
          variant: "destructive",
        });
      }
      return result.text;
    }

    try {
      return await file.text();
    } catch {
      throw new Error(t('error.cannotReadFileType', { extension }));
    }
  };

  const processFilesForMonth = useCallback(async (targetMonth: Date, filesOverride?: PendingFile[], accountId?: string) => {
    if (!user) {
      toast({
        title: t('error.genericError'),
        description: t('error.notSignedIn'),
        variant: "destructive",
      });
      return;
    }

    const monthKey = getMonthKey(targetMonth);
    const pendingFiles = filesOverride ?? (pendingFilesByMonth[monthKey] || []).filter(
      (f) => f.status === "pending"
    );

    if (pendingFiles.length === 0) return;

    const targetMonthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}-01`;

    for (const uploadFile of pendingFiles) {
      setPendingFilesByMonth((prev) => ({
        ...prev,
        [monthKey]: (prev[monthKey] || []).map((f) =>
          f.id === uploadFile.id ? { ...f, status: "processing" as const } : f
        ),
      }));

      try {
        const fileContent = await extractFileContent(uploadFile.file);

        if (!fileContent.trim()) {
          throw new Error(t('error.fileEmpty'));
        }

        const encoder = new TextEncoder();
        const hashData = encoder.encode(fileContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const { data: existingImport } = await supabase
          .from('imports')
          .select('id, file_name, transactions_count')
          .eq('user_id', user.id)
          .eq('file_hash_sha256', fileHash)
          .eq('status', 'NORMALIZED')
          .maybeSingle();

        if (existingImport) {
          toast({
            title: t('error.duplicateFile'),
            description: t('error.duplicateInvestmentDescription', { fileName: existingImport.file_name, count: existingImport.transactions_count || 0 }),
            variant: "destructive",
          });
          setPendingFilesByMonth((prev) => ({
            ...prev,
            [monthKey]: (prev[monthKey] || []).map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error" as const, error: t('error.duplicateFile') }
                : f
            ),
          }));
          continue;
        }

        const filePath = `${user.id}/investments/${Date.now()}_${uploadFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("financial-files")
          .upload(filePath, uploadFile.file);

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
        }

        const { data: importRecord, error: insertError } = await supabase
          .from("imports")
          .insert({
            user_id: user.id,
            file_name: uploadFile.name,
            file_storage_url: filePath,
            file_mime: uploadFile.file.type || "application/octet-stream",
            file_size: uploadFile.size,
            file_hash_sha256: fileHash,
            status: "UPLOADED",
            domain: "INVESTING",
            source_type: "BROKER",
            account_id: accountId || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const { data: responseData, error: previewError } = await supabase.functions.invoke(
          "process-investment-file",
          {
            body: {
              fileContent,
              importId: importRecord.id,
              userId: user.id,
              previewOnly: true,
            },
          }
        );

        if (previewError) throw previewError;

        // Smart import: edge function returns { data: { transactions, exchangeRates, positions }, stats }
        const smartData: SmartImportPreview = responseData.data || {
          transactions: [],
          exchangeRates: [],
          positions: [],
        };
        const smartStats: SmartImportStats = responseData.stats || null;

        setPreviewData(smartData);
        setPreviewStats(smartStats);
        setPendingImportId(importRecord.id);
        setSaveExchangeRates(true);
        setShowPreview(true);

        const totalCount =
          (smartData.transactions?.length || 0) +
          (smartData.positions?.length || 0);

        setPendingFilesByMonth((prev) => ({
          ...prev,
          [monthKey]: (prev[monthKey] || []).map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "completed" as const,
                  transactionsCount: totalCount,
                }
              : f
          ),
        }));

      } catch (error: any) {
        console.error("Error processing investment file:", error);
        setPendingFilesByMonth((prev) => ({
          ...prev,
          [monthKey]: (prev[monthKey] || []).map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error" as const, error: error.message || "Unknown error" }
              : f
          ),
        }));

        toast({
          title: t('error.processingError'),
          description: error.message || t('error.couldNotProcess'),
          variant: "destructive",
        });
      }
    }
  }, [user, pendingFilesByMonth, toast, queryClient, t]);

  const isProcessingMonth = useCallback((monthKey: string): boolean => {
    return (pendingFilesByMonth[monthKey] || []).some((f) => f.status === "processing");
  }, [pendingFilesByMonth]);

  const getPendingCountForMonth = useCallback((monthKey: string): number => {
    return (pendingFilesByMonth[monthKey] || []).filter(
      (f) => f.status === "pending" || f.status === "processing"
    ).length;
  }, [pendingFilesByMonth]);

  const confirmPreview = useCallback(async () => {
    if (!pendingImportId || !user || !previewData) return;

    setIsConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "process-investment-file",
        {
          body: {
            importId: pendingImportId,
            userId: user.id,
            previewOnly: false,
            smartImportData: {
              transactions: previewData.transactions,
              exchangeRates: previewData.exchangeRates,
              positions: previewData.positions,
              saveExchangeRates,
            },
          },
        }
      );

      if (error) throw error;

      const stats = data.stats;
      const parts: string[] = [];
      if (stats?.transactionsInserted > 0) {
        parts.push(t('toast.smartImportTx', { count: stats.transactionsInserted }));
      }
      if (stats?.positionsUpserted > 0) {
        parts.push(t('toast.smartImportPositions', { count: stats.positionsUpserted }));
      }
      if (stats?.ratesSaved > 0) {
        parts.push(t('toast.smartImportRates', { count: stats.ratesSaved }));
      }

      toast({
        title: t('toast.investmentsSaved'),
        description: parts.join(", ") || t('toast.movementsSaved', { count: 0 }),
      });

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["investment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });

      setShowPreview(false);
      setPreviewData(null);
      setPreviewStats(null);
      setPendingImportId(null);
    } catch (error: any) {
      console.error("Error confirming smart import:", error);
      toast({
        title: t('error.genericError'),
        description: error.message || t('error.couldNotSaveInvestments'),
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  }, [pendingImportId, user, queryClient, toast, previewData, saveExchangeRates, t]);

  const cancelPreview = useCallback(() => {
    setShowPreview(false);
    setPreviewData(null);
    setPreviewStats(null);
    setPendingImportId(null);
  }, []);

  return {
    pendingFilesByMonth,
    addFilesForMonth,
    removeFileFromMonth,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
    // Preview dialog state and handlers
    showPreview,
    previewData,
    previewStats,
    isConfirming,
    saveExchangeRates,
    setSaveExchangeRates,
    confirmPreview,
    cancelPreview,
  };
}
