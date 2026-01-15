import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PreviewTransaction, PreviewData, MovementType } from "@/components/dashboard/TransactionPreviewModal";
import { normalizeCategory } from "@/lib/categoryTranslations";

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

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
  transactionsCount?: number;
  stats?: {
    newTransactions: number;
    duplicatesIgnored: number;
    transfersDetected: number;
    totalParsed: number;
  };
}

// Helper to normalize movement from API response
function normalizeMovement(movement: string | undefined, type: string | undefined, amount: number): MovementType {
  if (movement) {
    const upper = movement.toUpperCase();
    if (upper === "INCOME" || upper === "EXPENSE" || upper === "TRANSFER") {
      return upper as MovementType;
    }
  }
  // Fallback to legacy type field
  if (type === "transfer") return "TRANSFER";
  if (type === "income" || amount > 0) return "INCOME";
  return "EXPENSE";
}

export function useFileUpload(isInvestment: boolean = false) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadedFile[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      file,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...uploadFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const extractFileContent = async (file: File): Promise<string> => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    
    if (extension === "csv") {
      return await file.text();
    }
    
    if (extension === "xlsx" || extension === "xls") {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      let content = "";
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        content += `Sheet: ${sheetName}\n${csv}\n\n`;
      });
      
      return content;
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

  const processFiles = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be signed in to upload files.",
        variant: "destructive",
      });
      return;
    }

    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    if (isInvestment) {
      await processFilesDirectly(pendingFiles);
      return;
    }

    for (const uploadFile of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "processing" as const } : f
        )
      );

      try {
        const filePath = `${user.id}/${Date.now()}_${uploadFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("financial-files")
          .upload(filePath, uploadFile.file);

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
        }

        // Generate file hash for imports table
        const fileContent = await extractFileContent(uploadFile.file);
        
        if (!fileContent.trim()) {
          throw new Error("The file is empty");
        }
        
        const encoder = new TextEncoder();
        const hashData = encoder.encode(fileContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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
            domain: "CASHFLOW",
            source_type: "BANK",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const { data: processResult, error: processError } = await supabase.functions.invoke(
          "process-financial-file",
          {
            body: {
              fileContent,
              importId: importRecord.id,
              userId: user.id,
              previewOnly: true,
            },
          }
        );

        if (processError) throw processError;

        // Transform response to PreviewData format with movement type
        const transactions: PreviewTransaction[] = (processResult.transactions || []).map(
          (t: any, index: number) => {
            const movement = normalizeMovement(t.movement, t.type, t.amount);
            // Normalize category to handle legacy values
            const category = normalizeCategory(t.category || "other_expense");
            return {
              tempId: `${importRecord.id}-${index}`,
              date: t.date,
              description: t.description,
              amount: t.amount,
              type: movement.toLowerCase() as "income" | "expense" | "transfer", // Legacy
              movement: movement,
              category: category,
              category_id: t.category_id,
              bank: t.bank,
              hash_source: t.hash_source || "",
              transaction_hash: t.transaction_hash,
              isEdited: false,
            };
          }
        );

        setPreviewData({
          transactions,
          stats: processResult.stats,
          uploadId: importRecord.id, // Using importId but keeping field name for compatibility
          fileName: uploadFile.name,
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "completed" as const }
              : f
          )
        );

      } catch (error: any) {
        console.error("Error processing file:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: error.message || "Unknown error",
                }
              : f
          )
        );

        toast({
          title: "Processing error",
          description: error.message || "Could not process the file",
          variant: "destructive",
        });
      }
    }
  };

  const processFilesDirectly = async (pendingFiles: UploadedFile[]) => {
    for (const uploadFile of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "processing" as const } : f
        )
      );

      try {
        const fileContent = await extractFileContent(uploadFile.file);
        
        if (!fileContent.trim()) {
          throw new Error("The file is empty");
        }

        const filePath = `${user!.id}/${Date.now()}_${uploadFile.name}`;
        await supabase.storage.from("financial-files").upload(filePath, uploadFile.file);

        // Generate file hash for imports table
        const encoder = new TextEncoder();
        const hashData = encoder.encode(fileContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Create import record (unified system)
        const { data: importRecord, error: insertError } = await supabase
          .from("imports")
          .insert({
            user_id: user!.id,
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

        const { data, error } = await supabase.functions.invoke(
          "process-investment-file",
          {
            body: {
              fileContent,
              importId: importRecord.id,
              userId: user!.id,
            },
          }
        );

        if (error) throw error;

        const stats = data.stats;
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "completed" as const,
                  transactionsCount: stats?.newInvestments || 0,
                  stats,
                }
              : f
          )
        );

        let description = `${stats?.newInvestments || 0} investments processed`;
        if (stats?.deposits > 0) description += ` (${stats.deposits} deposits`;
        if (stats?.withdrawals > 0) description += `, ${stats.withdrawals} withdrawals)`;
        else if (stats?.deposits > 0) description += ')';
        if (stats?.duplicatesIgnored > 0) description += `, ${stats.duplicatesIgnored} duplicates`;

        toast({
          title: "File processed",
          description: `${uploadFile.name}: ${description}`,
        });

        queryClient.invalidateQueries({ queryKey: ["investments"] });
        queryClient.invalidateQueries({ queryKey: ["investment_accounts"] });
        queryClient.invalidateQueries({ queryKey: ["imports"] });

      } catch (error: any) {
        console.error("Error processing file:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: error.message || "Unknown error",
                }
              : f
          )
        );

        toast({
          title: "Processing error",
          description: error.message || "Could not process the file",
          variant: "destructive",
        });
      }
    }
  };

  // Update a transaction's movement and/or category in preview
  const updatePreviewTransaction = (tempId: string, updates: { movement?: MovementType; category?: string }) => {
    if (!previewData) return;

    setPreviewData({
      ...previewData,
      hasUnsavedChanges: true, // Mark as having unsaved changes
      transactions: previewData.transactions.map((t) => {
        if (t.tempId !== tempId) return t;
        
        const newMovement = updates.movement || t.movement;
        const newCategory = updates.category || t.category;
        
        return { 
          ...t, 
          movement: newMovement,
          type: newMovement.toLowerCase() as "income" | "expense" | "transfer", // Keep legacy in sync
          category: newCategory,
          isEdited: true 
        };
      }),
    });
  };

  // Legacy function for backwards compatibility
  const updatePreviewCategory = (tempId: string, newCategory: string) => {
    updatePreviewTransaction(tempId, { category: newCategory });
  };

  const confirmPreviewTransactions = async () => {
    if (!previewData || !user) return;

    setIsConfirming(true);

    try {
      const { error } = await supabase.functions.invoke(
        "process-financial-file",
        {
          body: {
            importId: previewData.uploadId, // Now using imports table
            userId: user.id,
            confirmTransactions: true,
            transactions: previewData.transactions.map((t) => ({
              date: t.date,
              description: t.description,
              amount: t.amount,
              movement: t.movement, // Send movement type
              type: t.type, // Legacy
              category: t.category,
              bank: t.bank,
              transaction_hash: t.transaction_hash,
            })),
          },
        }
      );

      if (error) throw error;

      const editedCount = previewData.transactions.filter((t) => t.isEdited).length;
      
      toast({
        title: "Transactions saved",
        description: `${previewData.transactions.length} transactions saved${editedCount > 0 ? ` (${editedCount} edited)` : ""}`,
      });

      // Mark as saved but keep preview open for further edits
      setPreviewData({
        ...previewData,
        isSaved: true,
        hasUnsavedChanges: false,
        // Reset isEdited on all transactions after save
        transactions: previewData.transactions.map(t => ({ ...t, isEdited: false })),
      });
      
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });

      try {
        const { data: integrityData } = await supabase.functions.invoke(
          "check-data-integrity",
          { body: { userId: user.id } }
        );
        
        if (integrityData?.stats?.duplicatesRemoved > 0 || integrityData?.stats?.transfersLinked > 0) {
          toast({
            title: "Integrity verified",
            description: `${integrityData.stats.duplicatesRemoved} global duplicates removed, ${integrityData.stats.transfersLinked} transfers linked`,
          });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        }
      } catch (integrityError) {
        console.error("Integrity check error:", integrityError);
      }

    } catch (error: any) {
      console.error("Error confirming transactions:", error);
      toast({
        title: "Error saving",
        description: error.message || "Could not save the transactions",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const cancelPreview = () => {
    setPreviewData(null);
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "completed"));
  };

  return {
    files,
    addFiles,
    removeFile,
    processFiles,
    isProcessing: files.some((f) => f.status === "processing"),
    hasPending: files.some((f) => f.status === "pending"),
    previewData,
    updatePreviewCategory,
    updatePreviewTransaction,
    confirmPreviewTransactions,
    cancelPreview,
    isConfirming,
    clearCompleted,
  };
}
