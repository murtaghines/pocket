import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
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
      "Este PDF no tiene texto seleccionable (probablemente escaneado). Prueba con un PDF con texto o un Excel/CSV."
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

  const addFilesForMonth = useCallback((files: File[], targetMonth: Date) => {
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

  const processFilesForMonth = useCallback(async (targetMonth: Date) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para subir archivos.",
        variant: "destructive",
      });
      return;
    }

    const monthKey = getMonthKey(targetMonth);
    const pendingFiles = (pendingFilesByMonth[monthKey] || []).filter(
      (f) => f.status === "pending"
    );
    
    if (pendingFiles.length === 0) return;

    // Format target_month as first day of month (YYYY-MM-DD)
    const targetMonthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}-01`;

    for (const uploadFile of pendingFiles) {
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

        // Generate file hash for deduplication
        const encoder = new TextEncoder();
        const data = encoder.encode(fileContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Create import record in the new imports table
        const { data: importRecord, error: importError } = await supabase
          .from("imports")
          .insert({
            user_id: user.id,
            domain: "CASHFLOW" as const,
            file_name: uploadFile.name,
            file_hash_sha256: fileHash,
            file_mime: uploadFile.file.type || "application/octet-stream",
            file_size: uploadFile.size,
            file_storage_url: filePath,
            source_type: "BANK" as const,
            status: "UPLOADED" as const,
          })
          .select()
          .single();

        if (importError) throw importError;

        // Also create in uploads table for backwards compatibility
        await supabase
          .from("uploads")
          .insert({
            user_id: user.id,
            file_name: uploadFile.name,
            file_path: filePath,
            file_type: uploadFile.file.type || "unknown",
            file_size: uploadFile.size,
            status: "pending",
            target_month: targetMonthStr,
          });

        // Call the process-import edge function
        const { data: processData, error } = await supabase.functions.invoke(
          "process-import",
          {
            body: {
              fileContent,
              importId: importRecord.id,
              userId: user.id,
              periodMonthKey: monthKey,
            },
          }
        );

        if (error) throw error;

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
        let description = `${stats?.newTransactions || 0} transacciones nuevas`;
        if (stats?.duplicatesIgnored > 0) {
          description += `, ${stats.duplicatesIgnored} duplicados ignorados`;
        }
        if (stats?.transfersDetected > 0) {
          description += `, ${stats.transfersDetected} transferencias internas`;
        }

        toast({
          title: "Archivo procesado",
          description: `${uploadFile.name}: ${description}`,
        });

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["imports"] });
        queryClient.invalidateQueries({ queryKey: ["periods"] });
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
              description: `${integrityData.stats.duplicatesRemoved} duplicados eliminados, ${integrityData.stats.transfersLinked} transferencias vinculadas`,
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
              ? { ...f, status: "error" as const, error: error.message || "Error desconocido" }
              : f
          ),
        }));

        toast({
          title: "Error al procesar",
          description: error.message || "No se pudo procesar el archivo",
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

  return {
    pendingFilesByMonth,
    addFilesForMonth,
    removeFileFromMonth,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
  };
}
