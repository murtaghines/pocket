import { useState, useCallback, useRef, useEffect } from "react";
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

export interface PendingFile {
  id: string;
  name: string;
  size: number;
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
  transactionsCount?: number;
  progressLabel?: string;
  progressPercent?: number;
  startedAt?: number;
}

type PendingFilesByMonth = Record<string, PendingFile[]>;

async function pollForInvestmentImportSuccess(
  userId: string,
  fileHash: string,
): Promise<{ transactionsCount: number } | null> {
  const delays = [2000, 4000, 6000, 8000, 10000, 10000, 10000, 10000, 10000, 10000];
  for (const wait of delays) {
    await new Promise((r) => setTimeout(r, wait));
    const { data: row } = await supabase
      .from("imports")
      .select("id, status, transactions_count")
      .eq("user_id", userId)
      .eq("file_hash_sha256", fileHash)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row?.status === "NORMALIZED") {
      return { transactionsCount: row.transactions_count || 0 };
    }
    if (row?.status === "FAILED") return null;
  }
  return null;
}

export function useMonthlyInvestmentUpload() {
  const [pendingFilesByMonth, setPendingFilesByMonth] = useState<PendingFilesByMonth>({});
  const [previewData, setPreviewData] = useState<SmartImportPreview | null>(null);
  const [previewStats, setPreviewStats] = useState<SmartImportStats | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingImportId, setPendingImportId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [saveExchangeRates, setSaveExchangeRates] = useState(true);
  const [retryingImportIds, setRetryingImportIds] = useState<Set<string>>(new Set());
  const cancelledIdsRef = useRef<Set<string>>(new Set());
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation('imports');

  // beforeunload warning while files are in-flight
  const hasInFlightFiles = Object.values(pendingFilesByMonth).some((arr) =>
    arr.some((f) => f.status === "processing" || f.status === "pending")
  );
  useEffect(() => {
    if (!hasInFlightFiles) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasInFlightFiles]);

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

  const addFilesForMonth = useCallback((files: File[], targetMonth: Date): PendingFile[] => {
    if (!navigator.onLine) {
      toast({
        title: t('error.noConnection'),
        description: t('error.noConnectionDescription'),
        variant: "destructive",
      });
      return [];
    }

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
  }, [toast, t]);

  const removeFileFromMonth = useCallback((monthKey: string, fileId: string) => {
    setPendingFilesByMonth((prev) => ({
      ...prev,
      [monthKey]: (prev[monthKey] || []).filter((f) => f.id !== fileId),
    }));
  }, []);

  const cancelFile = useCallback((monthKey: string, fileId: string) => {
    cancelledIdsRef.current.add(fileId);
    setPendingFilesByMonth((prev) => ({
      ...prev,
      [monthKey]: (prev[monthKey] || []).filter((f) => f.id !== fileId),
    }));
  }, []);

  const processFilesForMonth = useCallback(async (targetMonth: Date, filesOverride?: PendingFile[], accountId?: string) => {
    if (!user) {
      toast({
        title: t('error.genericError'),
        description: t('error.notSignedIn'),
        variant: "destructive",
      });
      return;
    }

    if (!navigator.onLine) {
      toast({
        title: t('error.noConnection'),
        description: t('error.noConnectionDescription'),
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

    const patch = (fileId: string, changes: Partial<PendingFile>) => {
      setPendingFilesByMonth((prev) => ({
        ...prev,
        [monthKey]: (prev[monthKey] || []).map((f) =>
          f.id === fileId ? { ...f, ...changes } : f
        ),
      }));
    };

    for (const uploadFile of pendingFiles) {
      const isCancelled = () => cancelledIdsRef.current.has(uploadFile.id);
      let uploadedStoragePath: string | null = null;

      patch(uploadFile.id, {
        status: "processing",
        progressLabel: t('progress.readingFile'),
        progressPercent: 5,
        startedAt: Date.now(),
      });

      try {
        const fileContent = await extractFileContent(uploadFile.file);
        if (isCancelled()) return;

        if (!fileContent.trim()) {
          throw new Error(t('error.fileEmpty'));
        }

        patch(uploadFile.id, {
          progressLabel: t('progress.checkingDuplicates'),
          progressPercent: 18,
        });

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
          patch(uploadFile.id, {
            status: "error",
            error: t('error.duplicateFile'),
          });
          continue;
        }

        if (isCancelled()) return;
        patch(uploadFile.id, {
          progressLabel: t('progress.uploading'),
          progressPercent: 28,
        });

        const filePath = `${user.id}/investments/${Date.now()}_${uploadFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("financial-files")
          .upload(filePath, uploadFile.file);

        if (uploadError) {
          throw new Error(t('error.couldNotProcess'));
        }
        uploadedStoragePath = filePath;

        if (isCancelled()) return;

        patch(uploadFile.id, {
          progressLabel: t('progress.readingWithAi'),
          progressPercent: 38,
        });

        // AI extraction ramp — logarithmic progress from 38% to 88%
        const contentSize = fileContent.length;
        const speedFactor = contentSize < 3000 ? 0.7 : contentSize < 10000 ? 0.45 : 0.3;
        const aiRampStart = Date.now();
        const aiRamp = setInterval(() => {
          const elapsed = (Date.now() - aiRampStart) / 1000;
          const pct = Math.min(88, 38 + 18 * Math.log(1 + elapsed * speedFactor));
          const labels = [
            t('progress.readingWithAi'),
            t('progress.categorizing'),
            t('progress.crossChecking'),
            t('progress.almostDone'),
          ];
          const labelIdx = Math.min(labels.length - 1, Math.floor(elapsed / 12));
          patch(uploadFile.id, { progressLabel: labels[labelIdx], progressPercent: pct });
        }, 1200);

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

        if (insertError) {
          clearInterval(aiRamp);
          throw insertError;
        }

        let responseData: any;
        let previewError: any;

        try {
          const result = await supabase.functions.invoke(
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
          responseData = result.data;
          previewError = result.error;
        } finally {
          clearInterval(aiRamp);
        }

        if (isCancelled()) return;

        // Disconnect recovery: if the edge function call failed, poll to see
        // if the import actually landed server-side
        if (previewError) {
          patch(uploadFile.id, {
            progressLabel: t('progress.verifying'),
            progressPercent: 90,
          });
          const recovered = await pollForInvestmentImportSuccess(user.id, fileHash);
          if (recovered) {
            patch(uploadFile.id, {
              status: "completed",
              transactionsCount: recovered.transactionsCount,
              progressLabel: t('progress.done', { count: recovered.transactionsCount }),
              progressPercent: 100,
            });

            toast({
              title: t('toast.investmentsSaved'),
              description: t('toast.smartImportTx', { count: recovered.transactionsCount }),
            });

            queryClient.invalidateQueries({ queryKey: ["investments"] });
            queryClient.invalidateQueries({ queryKey: ["imports"] });
            queryClient.invalidateQueries({ queryKey: ["investment-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["holdings"] });
            queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
            continue;
          }
          throw previewError;
        }

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

        patch(uploadFile.id, {
          status: "completed",
          transactionsCount: totalCount,
          progressLabel: t('progress.done', { count: totalCount }),
          progressPercent: 100,
        });

      } catch (error: any) {
        if (isCancelled()) return;
        console.error("Error processing investment file:", error);

        patch(uploadFile.id, {
          status: "error",
          error: error.message || t('error.couldNotProcess'),
          progressLabel: undefined,
          progressPercent: undefined,
        });

        toast({
          title: t('error.processingError'),
          description: error.message || t('error.couldNotProcess'),
          variant: "destructive",
        });

        // Orphan file cleanup: if storage upload succeeded but no import record was created
        if (uploadedStoragePath) {
          try {
            const { count } = await supabase
              .from("imports")
              .select("id", { count: "exact", head: true })
              .eq("file_storage_url", uploadedStoragePath);
            if (!count) {
              await supabase.storage.from("financial-files").remove([uploadedStoragePath]);
            }
          } catch {
            // Best-effort cleanup
          }
        }
      } finally {
        cancelledIdsRef.current.delete(uploadFile.id);
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

  const isProcessingAny = useCallback((): boolean => {
    return Object.values(pendingFilesByMonth).some((arr) =>
      arr.some((f) => f.status === "processing" || f.status === "pending"),
    );
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

  const updateTransaction = useCallback((index: number, updated: SmartImportPreview["transactions"][number]) => {
    setPreviewData((prev) => {
      if (!prev) return prev;
      const txs = [...prev.transactions];
      txs[index] = updated;
      return { ...prev, transactions: txs };
    });
  }, []);

  const removeTransaction = useCallback((index: number) => {
    setPreviewData((prev) => {
      if (!prev) return prev;
      const txs = prev.transactions.filter((_, i) => i !== index);
      return { ...prev, transactions: txs };
    });
  }, []);

  const removePosition = useCallback((index: number) => {
    setPreviewData((prev) => {
      if (!prev) return prev;
      const positions = prev.positions.filter((_, i) => i !== index);
      return { ...prev, positions };
    });
  }, []);

  const retryImport = useCallback(async (
    importId: string,
    fileStorageUrl: string | null,
    fileName: string,
    accountId: string | null,
  ) => {
    if (!user) return;
    if (!fileStorageUrl) {
      toast({
        title: t('error.cantRetry'),
        description: t('error.cantRetryOriginalUnavailable'),
        variant: "destructive",
      });
      return;
    }

    setRetryingImportIds((prev) => new Set(prev).add(importId));
    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from("financial-files")
        .download(fileStorageUrl);
      if (downloadError || !blob) {
        throw new Error(t('error.couldNotRedownload'));
      }

      const file = new File([blob], fileName);
      const fileContent = await extractFileContent(file);
      if (!fileContent.trim()) {
        throw new Error(t('error.fileEmpty'));
      }

      const { data: responseData, error: previewError } = await supabase.functions.invoke(
        "process-investment-file",
        {
          body: {
            fileContent,
            importId,
            userId: user.id,
            previewOnly: true,
          },
        }
      );

      if (previewError) throw previewError;

      const smartData: SmartImportPreview = responseData.data || {
        transactions: [],
        exchangeRates: [],
        positions: [],
      };
      const smartStats: SmartImportStats = responseData.stats || null;

      setPreviewData(smartData);
      setPreviewStats(smartStats);
      setPendingImportId(importId);
      setSaveExchangeRates(true);
      setShowPreview(true);

      toast({
        title: t('toast.retryComplete'),
        description: t('toast.smartImportTx', { count: smartData.transactions?.length || 0 }),
      });

      queryClient.invalidateQueries({ queryKey: ["imports"] });
    } catch (err: any) {
      toast({
        title: t('error.retryFailed'),
        description: err.message || t('error.retryFailedDescription'),
        variant: "destructive",
      });
    } finally {
      setRetryingImportIds((prev) => {
        const next = new Set(prev);
        next.delete(importId);
        return next;
      });
    }
  }, [user, toast, queryClient, t]);

  return {
    pendingFilesByMonth,
    addFilesForMonth,
    removeFileFromMonth,
    cancelFile,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
    isProcessingAny,
    // Preview dialog state and handlers
    showPreview,
    previewData,
    previewStats,
    isConfirming,
    saveExchangeRates,
    setSaveExchangeRates,
    confirmPreview,
    cancelPreview,
    updateTransaction,
    removeTransaction,
    removePosition,
    // Retry
    retryImport,
    retryingImportIds,
  };
}
