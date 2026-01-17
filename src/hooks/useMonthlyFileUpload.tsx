import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile } from "@/lib/excelParser";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const maxPages = Math.min(pdf.numPages, 30);
  let content = "";

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = (textContent.items as any[])
      .map((item) => (typeof item?.str === "string" ? item.str : ""))
      .filter(Boolean)
      .join(" ");

    content += `\n\n--- Page ${pageNum} ---\n${pageText}`;
  }

  const trimmed = content.trim();
  if (trimmed.length < 50) {
    throw new Error(
      "This PDF has no selectable text (likely scanned). Try a PDF with text or an Excel/CSV file."
    );
  }

  return trimmed;
}

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

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function useMonthlyFileUpload() {
  const [pendingFilesByMonth, setPendingFilesByMonth] = useState<PendingFilesByMonth>({});
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const processFile = useCallback(async (uploadFile: PendingFile, targetMonth: Date, monthKey: string) => {
    if (!user) return;

    const targetMonthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}-01`;

    // Update status to processing
    setPendingFilesByMonth((prev) => ({
      ...prev,
      [monthKey]: (prev[monthKey] || []).map((f) =>
        f.id === uploadFile.id ? { ...f, status: "processing" as const } : f
      ),
    }));

    try {
      const fileContent = await extractFileContent(uploadFile.file);
      
      if (!fileContent.trim()) {
        throw new Error("The file is empty");
      }

      // Upload original file to storage
      const filePath = `${user.id}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("financial-files")
        .upload(filePath, uploadFile.file);

      if (uploadError) {
        throw new Error(
          "Could not upload the file (connection interrupted). Please try again."
        );
      }

      // Generate file hash for deduplication
      const encoder = new TextEncoder();
      const data = encoder.encode(fileContent);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Call the process-import edge function (uses imports table directly)
      const { data: processData, error } = await supabase.functions.invoke(
        "process-import",
        {
          body: {
            fileContent,
            userId: user.id,
            domain: "CASHFLOW",
            targetMonth: targetMonthStr,
            fileHash,
            fileName: uploadFile.name,
            fileSize: uploadFile.size,
            fileMime: uploadFile.file.type || "application/octet-stream",
            fileStorageUrl: filePath,
            sourceType: "BANK",
          },
        }
      );

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
        const message = payload?.message || "Could not process the file";

        // Handle specific error codes with appropriate UI
        if (code === "duplicate_file" || code === "period_closed" || code === "payment_required" || code === "rate_limited") {
          setPendingFilesByMonth((prev) => ({
            ...prev,
            [monthKey]: (prev[monthKey] || []).map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error" as const, error: message }
                : f
            ),
          }));

          let title = "Processing error";
          if (code === "duplicate_file") title = "Duplicate file";
          else if (code === "period_closed") title = "Period closed";
          else if (code === "payment_required") title = "No AI credits";
          else if (code === "rate_limited") title = "Too many requests";

          toast({
            title,
            description: message,
            variant: "destructive",
          });

          return;
        }

        throw new Error(message);
      }

      const stats = processData?.stats;
      
      // Update to completed
      setPendingFilesByMonth((prev) => ({
        ...prev,
        [monthKey]: (prev[monthKey] || []).map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "completed" as const, transactionsCount: stats?.newTransactions || 0 }
            : f
        ),
      }));

      // Build message
      let description = `${stats?.newTransactions || 0} new transactions`;
      if (stats?.duplicatesIgnored > 0) {
        description += `, ${stats.duplicatesIgnored} duplicates ignored`;
      }
      if (stats?.categorizedByLocalPattern > 0) {
        description += `, ${stats.categorizedByLocalPattern} categorized locally`;
      }
      if (stats?.transfersDetected > 0) {
        description += `, ${stats.transfersDetected} internal transfers`;
      }

      toast({
        title: "File processed",
        description: `${uploadFile.name}: ${description}`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["periods"] });
      
      // Run integrity check
      try {
        const { data: integrityData } = await supabase.functions.invoke(
          "check-data-integrity",
          { body: { userId: user.id } }
        );
        
        if (integrityData?.stats?.duplicatesRemoved > 0 || integrityData?.stats?.transfersLinked > 0) {
          toast({
            title: "Integrity verified",
            description: `${integrityData.stats.duplicatesRemoved} duplicates removed, ${integrityData.stats.transfersLinked} transfers linked`,
          });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
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
            ? { ...f, status: "error" as const, error: error.message || "Unknown error" }
            : f
        ),
      }));

      toast({
        title: "Processing error",
        description: error.message || "Could not process the file",
        variant: "destructive",
      });
    }
  }, [user, toast, queryClient]);

  const addFilesForMonth = useCallback((files: File[], targetMonth: Date) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be signed in to upload files.",
        variant: "destructive",
      });
      return;
    }

    // Check network status before attempting upload
    if (!navigator.onLine) {
      toast({
        title: "No connection",
        description: "You cannot upload files without an internet connection.",
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

    // Auto-process each file immediately
    newFiles.forEach((newFile) => {
      processFile(newFile, targetMonth, monthKey);
    });
  }, [user, toast, processFile]);

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
    
    if (extension === "xlsx" || extension === "xls") {
      return await parseExcelFile(file);
    }
    
    if (extension === "pdf") {
      return await extractPdfText(file);
    }

    try {
      return await file.text();
    } catch {
      throw new Error(`Cannot read file type: ${extension}`);
    }
  };

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

  return {
    pendingFilesByMonth,
    addFilesForMonth,
    removeFileFromMonth,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
  };
}
