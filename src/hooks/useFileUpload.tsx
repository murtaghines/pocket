import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PreviewTransaction, PreviewData } from "@/components/dashboard/TransactionPreviewModal";

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
      "Este PDF no tiene texto seleccionable (probablemente escaneado). Prueba con un PDF con texto o un Excel/CSV."
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

    // For other files, return the raw text if possible
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
        description: "Debes iniciar sesión para subir archivos.",
        variant: "destructive",
      });
      return;
    }

    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    // For investments, use the old flow (no preview)
    if (isInvestment) {
      await processFilesDirectly(pendingFiles);
      return;
    }

    // For cashflow, use preview flow
    for (const uploadFile of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "processing" as const } : f
        )
      );

      try {
        // Extract file content
        const fileContent = await extractFileContent(uploadFile.file);
        
        if (!fileContent.trim()) {
          throw new Error("El archivo está vacío");
        }

        // Upload original file to storage
        const filePath = `${user.id}/${Date.now()}_${uploadFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("financial-files")
          .upload(filePath, uploadFile.file);

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
        }

        // Create upload record
        const targetMonthStr = new Date().toISOString().slice(0, 7) + '-01';
        const { data: uploadRecord, error: insertError } = await supabase
          .from("uploads")
          .insert({
            user_id: user.id,
            file_name: uploadFile.name,
            file_path: filePath,
            file_type: uploadFile.file.type || "unknown",
            file_size: uploadFile.size,
            status: "pending",
            target_month: targetMonthStr,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Call edge function with previewOnly mode
        const { data, error } = await supabase.functions.invoke(
          "process-financial-file",
          {
            body: {
              fileContent,
              uploadId: uploadRecord.id,
              userId: user.id,
              previewOnly: true, // NEW: Don't save to DB yet
            },
          }
        );

        if (error) throw error;

        // Transform response to PreviewData format
        const transactions: PreviewTransaction[] = (data.transactions || []).map(
          (t: any, index: number) => ({
            tempId: `${uploadRecord.id}-${index}`,
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type as "income" | "expense" | "transfer",
            category: t.category,
            bank: t.bank,
            hash_source: t.hash_source || "",
            transaction_hash: t.transaction_hash,
            isEdited: false,
          })
        );

        setPreviewData({
          transactions,
          stats: data.stats,
          uploadId: uploadRecord.id,
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
                  error: error.message || "Error desconocido",
                }
              : f
          )
        );

        toast({
          title: "Error al procesar",
          description: error.message || "No se pudo procesar el archivo",
          variant: "destructive",
        });
      }
    }
  };

  // Direct processing for investments (no preview)
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
          throw new Error("El archivo está vacío");
        }

        const filePath = `${user!.id}/${Date.now()}_${uploadFile.name}`;
        await supabase.storage.from("financial-files").upload(filePath, uploadFile.file);

        const targetMonthStr = new Date().toISOString().slice(0, 7) + '-01';
        const { data: uploadRecord, error: insertError } = await supabase
          .from("uploads")
          .insert({
            user_id: user!.id,
            file_name: uploadFile.name,
            file_path: filePath,
            file_type: uploadFile.file.type || "unknown",
            file_size: uploadFile.size,
            status: "pending",
            target_month: targetMonthStr,
            domain: "INVESTING",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const { data, error } = await supabase.functions.invoke(
          "process-investment-file",
          {
            body: {
              fileContent,
              uploadId: uploadRecord.id,
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

        let description = `${stats?.newInvestments || 0} inversiones procesadas`;
        if (stats?.deposits > 0) description += ` (${stats.deposits} depósitos`;
        if (stats?.withdrawals > 0) description += `, ${stats.withdrawals} retiros)`;
        else if (stats?.deposits > 0) description += ')';
        if (stats?.duplicatesIgnored > 0) description += `, ${stats.duplicatesIgnored} duplicados`;

        toast({
          title: "Archivo procesado",
          description: `${uploadFile.name}: ${description}`,
        });

        queryClient.invalidateQueries({ queryKey: ["investments"] });
        queryClient.invalidateQueries({ queryKey: ["investment_accounts"] });
        queryClient.invalidateQueries({ queryKey: ["uploads"] });

      } catch (error: any) {
        console.error("Error processing file:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: error.message || "Error desconocido",
                }
              : f
          )
        );

        toast({
          title: "Error al procesar",
          description: error.message || "No se pudo procesar el archivo",
          variant: "destructive",
        });
      }
    }
  };

  // Update a transaction's category in preview
  const updatePreviewCategory = (tempId: string, newCategory: string) => {
    if (!previewData) return;

    setPreviewData({
      ...previewData,
      transactions: previewData.transactions.map((t) =>
        t.tempId === tempId
          ? { ...t, category: newCategory, isEdited: true }
          : t
      ),
    });
  };

  // Confirm and save all preview transactions
  const confirmPreviewTransactions = async () => {
    if (!previewData || !user) return;

    setIsConfirming(true);

    try {
      // Save transactions to DB
      const { error } = await supabase.functions.invoke(
        "process-financial-file",
        {
          body: {
            uploadId: previewData.uploadId,
            userId: user.id,
            confirmTransactions: true, // NEW: Actually save to DB
            transactions: previewData.transactions.map((t) => ({
              date: t.date,
              description: t.description,
              amount: t.amount,
              type: t.type,
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
        title: "Transacciones importadas",
        description: `${previewData.transactions.length} transacciones guardadas${editedCount > 0 ? ` (${editedCount} editadas)` : ""}`,
      });

      // Clear preview and refresh data
      setPreviewData(null);
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["uploads"] });

      // Run integrity check
      try {
        const { data: integrityData } = await supabase.functions.invoke(
          "check-data-integrity",
          { body: { userId: user.id } }
        );
        
        if (integrityData?.stats?.duplicatesRemoved > 0 || integrityData?.stats?.transfersLinked > 0) {
          toast({
            title: "Integridad verificada",
            description: `${integrityData.stats.duplicatesRemoved} duplicados globales eliminados, ${integrityData.stats.transfersLinked} transferencias vinculadas`,
          });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        }
      } catch (integrityError) {
        console.error("Integrity check error:", integrityError);
      }

    } catch (error: any) {
      console.error("Error confirming transactions:", error);
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudieron guardar las transacciones",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const cancelPreview = () => {
    setPreviewData(null);
    // Optionally delete the upload record
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "completed"));
  };

  return {
    files,
    addFiles,
    removeFile,
    processFiles,
    clearCompleted,
    hasFiles: files.length > 0,
    hasPending: files.some((f) => f.status === "pending"),
    isProcessing: files.some((f) => f.status === "processing"),
    // Preview-related
    previewData,
    updatePreviewCategory,
    confirmPreviewTransactions,
    cancelPreview,
    isConfirming,
  };
}
