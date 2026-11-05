import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile } from "@/lib/excelParser";
import {
  extractPdfText,
  getMonthKey,
  isImageFile,
  imageToBase64,
  renderPdfPagesToImages,
} from "@/lib/fileExtract";

interface PendingFile {
  id: string;
  name: string;
  size: number;
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
  transactionsCount?: number;
  /** Friendly label of what we're doing right now ("Reading file", "Asking AI…"). */
  progressLabel?: string;
  /** 0–100 estimate. AI step uses a logarithmic ramp because we can't poll it. */
  progressPercent?: number;
  /** Wall-clock when processing started — used for the AI ramp. */
  startedAt?: number;
}

type PendingFilesByMonth = Record<string, PendingFile[]>;

// Special bucket key for files uploaded without a forced target month.
const AUTO_BUCKET_KEY = "__auto__";

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/**
 * After a network/timeout error, poll the `imports` table to see whether the
 * edge function actually finished its work server-side. We try a few times
 * with backoff because the row may still be in-flight when we check.
 * Returns a synthetic processData payload on success, or null if it really
 * failed.
 */
async function pollForImportSuccess(
  userId: string,
  fileHash: string,
): Promise<{ stats: { newTransactions: number; duplicatesIgnored: number }; monthsDistribution: Record<string, { new: number; duplicates: number }>; skippedMonths: never[] } | null> {
  const delays = [2000, 3000, 4000, 5000, 6000]; // ~20s total
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
      return {
        stats: {
          newTransactions: row.transactions_count || 0,
          duplicatesIgnored: 0,
        },
        monthsDistribution: {},
        skippedMonths: [],
      };
    }
    if (row?.status === "FAILED") return null;
  }
  return null;
}

export function useMonthlyFileUpload() {
  const [pendingFilesByMonth, setPendingFilesByMonth] = useState<PendingFilesByMonth>({});
  const [retryingImportIds, setRetryingImportIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation('imports');

  const processFile = useCallback(async (
    uploadFile: PendingFile,
    targetMonth: Date | null,
    monthKey: string,
    accountId?: string,
  ) => {
    if (!user) return;

    // When targetMonth is null we're in AUTO distribution mode — let the
    // backend split the file across whatever months it actually contains.
    const targetMonthStr = targetMonth
      ? `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}-01`
      : null;

    // Helper: patch a single field on this file's progress state
    const patch = (changes: Partial<PendingFile>) => {
      setPendingFilesByMonth((prev) => ({
        ...prev,
        [monthKey]: (prev[monthKey] || []).map((f) =>
          f.id === uploadFile.id ? { ...f, ...changes } : f
        ),
      }));
    };

    // Update status to processing
    patch({
      status: "processing",
      progressLabel: t('progress.readingFile'),
      progressPercent: 5,
      startedAt: Date.now(),
    });

    try {
      const extracted = await extractFileContent(uploadFile.file);
      patch({ progressLabel: t('progress.checkingDuplicates'), progressPercent: 18 });

      const hasText = extracted.text.trim().length > 0;
      const hasImages = (extracted.images?.length || 0) > 0;
      if (!hasText && !hasImages) {
        throw new Error(t('error.fileEmpty'));
      }

      // Generate file hash for deduplication BEFORE uploading.
      // For image-based content, hash the first image's base64 (stable per file).
      const hashSource = hasText
        ? extracted.text
        : extracted.images![0].base64;
      const encoder = new TextEncoder();
      const data = encoder.encode(hashSource);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Client-side duplicate check against existing imports
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
          description: t('error.duplicateFileDescription', { fileName: existingImport.file_name, count: existingImport.transactions_count || 0 }),
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
        return;
      }

      patch({ progressLabel: t('progress.uploading'), progressPercent: 28 });
      // Upload original file to storage
      const filePath = `${user.id}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("financial-files")
        .upload(filePath, uploadFile.file);

      if (uploadError) {
        throw new Error(t('error.couldNotUpload'));
      }

      patch({
        progressLabel: t('progress.readingWithAi'),
        progressPercent: 38,
      });

      // The AI extraction step can take 20-90s; we don't get progress events
      // back, so we ramp the bar logarithmically toward 88% to convey "still
      // working" without ever pretending we're done.
      // Speed factor adapts to content size: small files resolve quickly, large
      // files and images take longer — so the ramp slows down proportionally.
      const contentSize = hasText ? extracted.text.length : (extracted.images?.length || 1) * 50_000;
      const speedFactor = contentSize < 3000 ? 0.7 : contentSize < 10000 ? 0.45 : contentSize < 30000 ? 0.3 : 0.18;
      const aiRampStart = Date.now();
      const aiRamp = setInterval(() => {
        const elapsed = (Date.now() - aiRampStart) / 1000;
        const pct = Math.min(88, 38 + 18 * Math.log(1 + elapsed * speedFactor));
        const labels = hasImages
          ? [
              t('progress.analyzingImages'),
              t('progress.extractingFromImage'),
              t('progress.crossChecking'),
              t('progress.almostDone'),
            ]
          : [
              t('progress.readingWithAi'),
              t('progress.categorizing'),
              t('progress.crossChecking'),
              t('progress.almostDone'),
            ];
        const labelIdx = Math.min(labels.length - 1, Math.floor(elapsed / 12));
        patch({ progressLabel: labels[labelIdx], progressPercent: pct });
      }, 1200);

      // Call the process-import edge function (uses imports table directly)
      let { data: processData, error } = await supabase.functions.invoke(
        "process-import",
        {
          body: {
            fileContent: hasText ? extracted.text : "",
            // Vision path: send base64 images for image files / scanned PDFs
            ...(hasImages ? { imageContent: extracted.images } : {}),
            userId: user.id,
            domain: "CASHFLOW",
            // Omit targetMonth in auto mode so the backend distributes
            // transactions across their real posted months.
            ...(targetMonthStr ? { targetMonth: targetMonthStr } : {}),
            fileHash,
            fileName: uploadFile.name,
            fileSize: uploadFile.size,
            fileMime: uploadFile.file.type || "application/octet-stream",
            fileStorageUrl: filePath,
            sourceType: "BANK",
            accountId: accountId || null,
          },
        }
      ).finally(() => clearInterval(aiRamp));

      // RECOVERY: edge functions sometimes finish processing successfully but
      // the HTTP connection drops before we get the response (timeout / network
      // hiccup). Before declaring failure, poll the imports table — if the row
      // is there with NORMALIZED status, processing actually succeeded and we
      // should treat this as success.
      if (error) {
        patch({ progressLabel: t('progress.verifying'), progressPercent: 90 });
        const recovered = await pollForImportSuccess(user.id, fileHash);
        if (recovered) {
          processData = recovered;
          error = null as any;
        }
      }

      // Handle non-2xx responses
      if (error) {
        let payload: any = null;

        const ctx = (error as any)?.context;
        if (ctx && typeof ctx?.clone === "function" && typeof ctx?.json === "function") {
          try {
            payload = await ctx.clone().json();
          } catch {
            // ignore
          }
        }

        if (!payload) {
          const errorStr = (error as any)?.message || String(error);
          const jsonMatch = errorStr.match(/\{[^}]+\}/);
          if (jsonMatch) {
            try {
              payload = JSON.parse(jsonMatch[0]);
            } catch {
              // ignore
            }
          }
        }

        const code = payload?.error;
        const message = payload?.message || t('error.couldNotProcess');

        if (code === "duplicate_file" || code === "period_closed" || code === "payment_required" || code === "rate_limited" || code === "parse_failed") {
          setPendingFilesByMonth((prev) => ({
            ...prev,
            [monthKey]: (prev[monthKey] || []).map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error" as const, error: message }
                : f
            ),
          }));

          const titleMap: Record<string, string> = {
            duplicate_file: t('error.duplicateFile'),
            period_closed: t('error.periodClosed'),
            payment_required: t('error.noAiCredits'),
            rate_limited: t('error.tooManyRequests'),
            parse_failed: t('error.couldNotReadFile'),
          };

          toast({
            title: titleMap[code] || t('error.processingError'),
            description: message,
            variant: "destructive",
          });

          return;
        }

        throw new Error(message);
      }

      const stats = processData?.stats;
      patch({ progressLabel: t('progress.saving'), progressPercent: 92 });
      const monthsDistribution: Record<string, { new: number; duplicates: number }> =
        processData?.monthsDistribution || {};
      const skippedMonths: Array<{ month: string; reason: string; count: number }> =
        processData?.skippedMonths || [];
      const distributedMonths = Object.entries(monthsDistribution)
        .filter(([, v]) => (v?.new || 0) > 0 || (v?.duplicates || 0) > 0)
        .sort(([a], [b]) => a.localeCompare(b));
      
      // Update to completed
      setPendingFilesByMonth((prev) => ({
        ...prev,
        [monthKey]: (prev[monthKey] || []).map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "completed" as const,
                transactionsCount: stats?.newTransactions || 0,
                progressLabel: t('progress.done', { count: stats?.newTransactions || 0 }),
                progressPercent: 100,
              }
            : f
        ),
      }));

      // Build human-friendly distribution summary
      const totalNew = stats?.newTransactions || 0;
      const totalDup = stats?.duplicatesIgnored || 0;
      let description = t('toast.newTransactions', { count: totalNew });
      if (distributedMonths.length > 1) {
        const breakdown = distributedMonths
          .filter(([, v]) => (v.new || 0) > 0)
          .map(([m, v]) => `${formatMonthLabel(m)} (${v.new})`)
          .join(", ");
        description = t('toast.newTransactionsDistributed', { count: totalNew, breakdown });
      } else if (distributedMonths.length === 1) {
        const [m, v] = distributedMonths[0];
        description = t('toast.newInMonth', { count: v.new, month: formatMonthLabel(m) });
      }
      if (totalDup > 0) description += t('toast.duplicatesIgnored', { count: totalDup });

      toast({
        title: uploadFile.name,
        description,
      });

      // Surface any months we couldn't write to (closed period, etc.)
      if (skippedMonths.length > 0) {
        const skippedList = skippedMonths
          .map((s) => `${formatMonthLabel(s.month)} (${s.count})`)
          .join(", ");
        toast({
          title: t('toast.skippedMonthsTitle'),
          description: t('toast.skippedMonthsDescription', { list: skippedList }),
          variant: "destructive",
        });
      }

      // Refresh data
      try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["periods"] });
      queryClient.invalidateQueries({ queryKey: ["month-transactions-inline"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-period-series"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
      queryClient.invalidateQueries({ queryKey: ["account-period-summary"] });

      // Run integrity check
      try {
        const { data: integrityData } = await supabase.functions.invoke(
          "check-data-integrity",
          { body: { userId: user.id } }
        );
        
        if (integrityData?.stats?.transfersLinked > 0) {
          toast({
            title: t('toast.integrityVerified'),
            description: t('toast.transfersLinked', { count: integrityData.stats.transfersLinked }),
          });
          try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["month-transactions-inline"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-period-series"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-opening-balances"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
          queryClient.invalidateQueries({ queryKey: ["account-period-summary"] });
        }
      } catch (integrityError) {
        console.error("Integrity check error:", integrityError);
      }

      // Remove completed file from pending after a delay
      setTimeout(() => {
        setPendingFilesByMonth((prev) => ({
          ...prev,
          [monthKey]: (prev[monthKey] || []).filter((f) => f.id !== uploadFile.id),
        }));
      }, 2000);

    } catch (error: any) {
      console.error("Error processing file:", error);
      
      setPendingFilesByMonth((prev) => ({
        ...prev,
        [monthKey]: (prev[monthKey] || []).map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "error" as const, error: error.message || t('error.unknownError') }
            : f
        ),
      }));

      toast({
        title: t('error.processingError'),
        description: error.message || t('error.couldNotProcess'),
        variant: "destructive",
      });
    }
  }, [user, toast, queryClient, t]);

  const addFilesForMonth = useCallback((files: File[], targetMonth: Date, accountId?: string) => {
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

    newFiles.forEach((newFile) => {
      processFile(newFile, targetMonth, monthKey, accountId);
    });
  }, [user, toast, processFile, t]);

  /**
   * Auto-distribute mode: upload one or more files without forcing a target
   * month. The backend distributes each file's transactions across whichever
   * months they actually belong to.
   */
  const addFiles = useCallback((files: File[], accountId?: string) => {
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

    const monthKey = AUTO_BUCKET_KEY;
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

    newFiles.forEach((newFile) => {
      processFile(newFile, null, monthKey, accountId);
    });
  }, [user, toast, processFile, t]);

  const removeFileFromMonth = useCallback((monthKey: string, fileId: string) => {
    setPendingFilesByMonth((prev) => ({
      ...prev,
      [monthKey]: (prev[monthKey] || []).filter((f) => f.id !== fileId),
    }));
  }, []);

  interface ExtractedContent {
    text: string;
    images?: Array<{ base64: string; mediaType: string }>;
  }

  const extractFileContent = async (file: File): Promise<ExtractedContent> => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (isImageFile(file.name)) {
      const img = await imageToBase64(file);
      return { text: "", images: [img] };
    }

    if (extension === "csv") {
      return { text: await file.text() };
    }

    if (extension === "xlsx") {
      return { text: await parseExcelFile(file) };
    }

    if (extension === "pdf") {
      const result = await extractPdfText(file);

      if (result.scanned) {
        const pages = await renderPdfPagesToImages(file);
        if (pages.length === 0) {
          throw new Error("Could not read this scanned PDF. Try uploading a photo of each page.");
        }
        toast({
          title: t('pdf.scannedDetected'),
          description: t('pdf.scannedDescription', { count: pages.length }),
        });
        return { text: "", images: pages };
      }

      if (result.truncated) {
        toast({
          title: t('pdf.partiallyProcessed'),
          description: t('pdf.partiallyProcessedDescription', { processed: result.processedPages, total: result.totalPages }),
          variant: "destructive",
        });
      }
      return { text: result.text };
    }

    try {
      return { text: await file.text() };
    } catch {
      throw new Error(t('error.cannotReadFileType', { extension }));
    }
  };

  /**
   * Retry a FAILED or PARTIAL import: re-download the original file from storage
   * (uploaded once, kept forever at `file_storage_url`) and re-run process-import on it.
   * This is safe to just re-run wholesale — the DB-enforced fingerprint uniqueness
   * (Fase 4) silently skips rows that already landed, so only the genuinely missing
   * ones get inserted. The old FAILED/PARTIAL import row is left as-is (harmless
   * history — it contributed 0 or partial transactions either way); the retry creates
   * its own new import row rather than mutating the old one in place.
   */
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
      const extracted = await extractFileContent(file);
      const hasImages = !!extracted.images && extracted.images.length > 0;
      if (!hasImages && !extracted.text.trim()) {
        throw new Error(t('error.fileEmpty'));
      }

      const hashSource = hasImages ? extracted.images![0].base64 : extracted.text;
      const encoder = new TextEncoder();
      const data = encoder.encode(hashSource);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: processData, error } = await supabase.functions.invoke(
        "process-import",
        {
          body: {
            fileContent: hasImages ? undefined : extracted.text,
            imageContent: hasImages ? extracted.images : undefined,
            userId: user.id,
            domain: "CASHFLOW",
            fileHash,
            fileName,
            fileSize: blob.size,
            fileMime: blob.type || "application/octet-stream",
            fileStorageUrl,
            sourceType: "BANK",
            accountId: accountId || null,
          },
        }
      );

      if (error) {
        throw new Error(error.message || t('error.retryFailed'));
      }

      const stats = processData?.stats;
      toast({
        title: t('toast.retryComplete'),
        description: stats?.duplicatesIgnored
          ? t('toast.retryCompleteWithDuplicates', { count: stats?.newTransactions || 0, duplicates: stats.duplicatesIgnored })
          : t('toast.retryCompleteDescription', { count: stats?.newTransactions || 0 }),
      });

      try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["periods"] });
      queryClient.invalidateQueries({ queryKey: ["month-transactions-inline"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-period-series"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
      queryClient.invalidateQueries({ queryKey: ["account-period-summary"] });
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

  // Keep for backwards compatibility but now it's a no-op since files auto-process
  const processFilesForMonth = useCallback(async (_targetMonth: Date) => {
    // Files are now auto-processed when added, this is kept for API compatibility
  }, []);

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

  return {
    pendingFilesByMonth,
    addFilesForMonth,
    addFiles,
    removeFileFromMonth,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
    isProcessingAny,
    retryImport,
    retryingImportIds,
  };
}
