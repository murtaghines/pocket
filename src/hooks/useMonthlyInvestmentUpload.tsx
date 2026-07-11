import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile } from "@/lib/excelParser";
import { extractPdfText, getMonthKey } from "@/lib/fileExtract";

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
  const [previewInvestments, setPreviewInvestments] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingImportId, setPendingImportId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Returns the created PendingFile entries so a caller that wants to auto-process
  // immediately (see processFilesForMonth's `filesOverride`) doesn't have to read them back
  // out of `pendingFilesByMonth` state, which may not have committed yet.
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

  // `filesOverride` lets a caller that just added files via addFilesForMonth process
  // exactly those files immediately, instead of reading pendingFilesByMonth back out of
  // this hook's closure — that state update may not have committed/re-rendered yet, which
  // previously made auto-process-after-add silently no-op (found zero pending files and
  // returned before ever calling the AI). Falls back to reading state for any other caller.
  const processFilesForMonth = useCallback(async (targetMonth: Date, filesOverride?: PendingFile[]) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files.",
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
          throw new Error("The file is empty");
        }

        // Generate file hash BEFORE uploading, so an exact re-upload short-circuits with a
        // clean message instead of hitting imports' UNIQUE(user_id, file_hash_sha256) as a
        // raw Postgres error. Mirrors useMonthlyFileUpload.tsx's bank-statement flow.
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
            title: "Duplicate file",
            description: `This file was already processed (${existingImport.file_name}, ${existingImport.transactions_count || 0} investments).`,
            variant: "destructive",
          });
          setPendingFilesByMonth((prev) => ({
            ...prev,
            [monthKey]: (prev[monthKey] || []).map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error" as const, error: "Duplicate file" }
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

        // Create import record (unified system)
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
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // First pass: preview only (don't persist yet)
        const { data: previewData, error: previewError } = await supabase.functions.invoke(
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

        // Show preview dialog
        const previewInvestments = previewData.data || [];
        setPreviewInvestments(previewInvestments);
        setPendingImportId(importRecord.id);
        setShowPreview(true);

        // Mark file as ready for preview
        setPendingFilesByMonth((prev) => ({
          ...prev,
          [monthKey]: (prev[monthKey] || []).map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "completed" as const,
                  transactionsCount: previewInvestments.length,
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
          title: "Processing error",
          description: error.message || "Could not process the file",
          variant: "destructive",
        });
      }
    }
  }, [user, pendingFilesByMonth, toast, queryClient]);

  const isProcessingMonth = useCallback((monthKey: string): boolean => {
    return (pendingFilesByMonth[monthKey] || []).some((f) => f.status === "processing");
  }, [pendingFilesByMonth]);

  const getPendingCountForMonth = useCallback((monthKey: string): number => {
    return (pendingFilesByMonth[monthKey] || []).filter(
      (f) => f.status === "pending" || f.status === "processing"
    ).length;
  }, [pendingFilesByMonth]);

  const confirmPreview = useCallback(async () => {
    if (!pendingImportId || !user) return;

    setIsConfirming(true);
    try {
      // Second pass: persist. Sends back the exact array the first pass already parsed and
      // returned (previewInvestments) instead of fileContent — the edge function skips the
      // AI call entirely on this path, so what gets saved is guaranteed to match what was
      // shown in the preview, with no second AI round-trip.
      const { data, error } = await supabase.functions.invoke(
        "process-investment-file",
        {
          body: {
            importId: pendingImportId,
            userId: user.id,
            previewOnly: false,
            investments: previewInvestments,
          },
        }
      );

      if (error) throw error;

      const stats = data.stats;
      let description = `${stats?.newInvestments || 0} movements saved`;
      if (stats?.duplicatesIgnored > 0) {
        description += `, ${stats.duplicatesIgnored} duplicates ignored`;
      }

      toast({
        title: "Investments saved",
        description,
      });

      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });

      setShowPreview(false);
      setPreviewInvestments([]);
      setPendingImportId(null);
    } catch (error: any) {
      console.error("Error confirming investments:", error);
      toast({
        title: "Error",
        description: error.message || "Could not save investments",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  }, [pendingImportId, user, queryClient, toast, previewInvestments]);

  const cancelPreview = useCallback(() => {
    setShowPreview(false);
    setPreviewInvestments([]);
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
    previewInvestments,
    isConfirming,
    confirmPreview,
    cancelPreview,
  };
}
