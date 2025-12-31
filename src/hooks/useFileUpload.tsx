import { useState } from "react";
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

export function useFileUpload(_isInvestment: boolean = false) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
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
          // Continue even if storage fails - we can still process the content
        }

        // Create upload record
        const { data: uploadRecord, error: insertError } = await supabase
          .from("uploads")
          .insert({
            user_id: user.id,
            file_name: uploadFile.name,
            file_path: filePath,
            file_type: uploadFile.file.type || "unknown",
            file_size: uploadFile.size,
            status: "pending",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Call edge function to process with AI
        const { data, error } = await supabase.functions.invoke(
          "process-financial-file",
          {
            body: {
              fileContent,
              uploadId: uploadRecord.id,
              userId: user.id,
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
                  transactionsCount: stats?.newTransactions || 0,
                  stats,
                }
              : f
          )
        );

        // Build detailed message
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

        // Refresh transactions and uploads
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["uploads"] });
        
        // Run integrity check after processing
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
  };
}
