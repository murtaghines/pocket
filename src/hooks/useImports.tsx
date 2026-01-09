import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type ImportStatus = 'UPLOADED' | 'PARSED' | 'NORMALIZED' | 'FAILED';
export type SourceType = 'BANK' | 'BROKER' | 'SAVINGS' | 'CARD' | 'OTHER';
export type AppDomain = 'CASHFLOW' | 'INVESTING';

export interface Import {
  id: string;
  user_id: string;
  period_id: string | null;
  account_id: string | null;
  domain: AppDomain;
  source_type: SourceType;
  file_name: string;
  file_mime: string | null;
  file_size: number | null;
  file_storage_url: string | null;
  file_hash_sha256: string;
  uploaded_at: string;
  status: ImportStatus;
  error_message: string | null;
  transactions_count: number | null;
  target_month?: string; // YYYY-MM from period
}

interface ProcessImportParams {
  fileContent: string;
  fileName: string;
  fileSize?: number;
  fileMime?: string;
  domain: AppDomain;
  targetMonth: string; // 'YYYY-MM'
  sourceType?: SourceType;
  fileHash?: string;
}

interface ProcessImportResult {
  success: boolean;
  message: string;
  importId?: string;
  stats?: {
    totalParsed: number;
    newTransactions: number;
    duplicatesIgnored: number;
    dateWarnings: number;
  };
  dateWarnings?: Array<{
    date: string;
    description: string;
    expected: string;
    found: string;
  }>;
  error?: string;
}

export function useImports(domain?: AppDomain) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: imports = [], isLoading, error } = useQuery({
    queryKey: ['imports', user?.id, domain],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Join with periods to get month_key
      let query = supabase
        .from('imports')
        .select(`
          *,
          periods!imports_period_id_fkey (
            month_key
          )
        `)
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });
      
      if (domain) {
        query = query.eq('domain', domain);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching imports:', error);
        throw error;
      }

      // Flatten the periods data
      return (data || []).map((imp: any) => ({
        ...imp,
        target_month: imp.periods?.month_key || imp.uploaded_at.substring(0, 7),
        periods: undefined // Remove nested object
      })) as Import[];
    },
    enabled: !!user?.id,
  });

  const processImport = useMutation({
    mutationFn: async (params: ProcessImportParams): Promise<ProcessImportResult> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('process-import', {
        body: {
          fileContent: params.fileContent,
          fileName: params.fileName,
          fileSize: params.fileSize,
          fileMime: params.fileMime,
          fileHash: params.fileHash,
          userId: user.id,
          domain: params.domain,
          targetMonth: params.targetMonth,
          sourceType: params.sourceType || 'OTHER'
        }
      });

      // Handle errors from edge function
      if (error) {
        let payload: { error?: string; message?: string } | null = null;

        // Try to parse JSON from the Response in error.context (FunctionsHttpError)
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx?.json === 'function') {
          try {
            payload = await ctx.json();
          } catch {
            // ignore
          }
        }

        // Fallback: extract JSON from error message string
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
        const message = payload?.message || 'Error al procesar el archivo';

        if (code === 'duplicate_file') {
          throw new Error(message);
        }
        if (code === 'period_closed') {
          throw new Error(message);
        }
        
        throw new Error(message);
      }
      
      // Check for error in successful response body
      if (data?.error === 'duplicate_file') {
        throw new Error(data.message || 'Este archivo ya fue importado');
      }

      if (data?.error === 'period_closed') {
        throw new Error(data.message || 'El período está cerrado');
      }

      if (data?.error) {
        throw new Error(data.message || data.error);
      }

      return data as ProcessImportResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      
      if (data.dateWarnings && data.dateWarnings.length > 0) {
        toast.warning(`${data.message}. ${data.dateWarnings.length} transacciones con fechas fuera del mes.`);
      } else {
        toast.success(data.message);
      }
    },
    onError: (error) => {
      console.error('Error processing import:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar el archivo');
    }
  });

  const deleteImport = useMutation({
    mutationFn: async (importId: string) => {
      // First delete related transactions
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('import_id', importId);

      if (txError) throw txError;

      // Then delete the import (import_rows cascade automatically)
      const { error } = await supabase
        .from('imports')
        .delete()
        .eq('id', importId);

      if (error) throw error;

      // Log to audit
      if (user?.id) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          entity_type: 'import',
          entity_id: importId,
          action: 'delete',
          diff_json: { deleted_at: new Date().toISOString() }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Archivo eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting import:', error);
      toast.error('Error al eliminar el archivo');
    }
  });

  // Helper to extract PDF text
  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
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
      throw new Error("PDF sin texto seleccionable (probablemente escaneado).");
    }
    return trimmed;
  };

  // Retry a failed import: download file from storage, re-process it
  const retryImport = useMutation({
    mutationFn: async (imp: Import) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!imp.file_storage_url) throw new Error("No hay archivo almacenado para reintentar");

      // 1. Delete old import record (and related transactions)
      const { error: txDelError } = await supabase
        .from("transactions")
        .delete()
        .eq("import_id", imp.id);
      if (txDelError) console.error("Error deleting old transactions:", txDelError);

      const { error: impDelError } = await supabase
        .from("imports")
        .delete()
        .eq("id", imp.id);
      if (impDelError) throw new Error("No se pudo eliminar el import anterior");

      // 2. Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("financial-files")
        .download(imp.file_storage_url);

      if (downloadError || !fileData) {
        throw new Error("No se pudo descargar el archivo. Sube el archivo de nuevo.");
      }

      // 3. Extract content based on file type
      const extension = imp.file_name.split(".").pop()?.toLowerCase();
      let fileContent = "";

      if (extension === "csv") {
        fileContent = await fileData.text();
      } else if (extension === "xlsx" || extension === "xls") {
        const arrayBuffer = await fileData.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          fileContent += `Sheet: ${sheetName}\n${csv}\n\n`;
        });
      } else if (extension === "pdf") {
        const arrayBuffer = await fileData.arrayBuffer();
        fileContent = await extractPdfText(arrayBuffer);
      } else {
        fileContent = await fileData.text();
      }

      if (!fileContent.trim()) {
        throw new Error("Archivo vacío o sin contenido legible");
      }

      // 4. Generate file hash
      const encoder = new TextEncoder();
      const data = encoder.encode(fileContent);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Get target month from period
      const targetMonth = imp.target_month || imp.uploaded_at.substring(0, 7);

      // 5. Call process-import edge function
      const { data: processData, error: processError } = await supabase.functions.invoke(
        "process-import",
        {
          body: {
            fileContent,
            userId: user.id,
            domain: imp.domain,
            targetMonth: `${targetMonth}-01`,
            fileHash,
            fileName: imp.file_name,
            fileSize: imp.file_size,
            fileMime: imp.file_mime || "application/octet-stream",
            fileStorageUrl: imp.file_storage_url,
            sourceType: imp.source_type,
          },
        }
      );

      if (processError) {
        let message = "Error al reprocesar el archivo";
        const ctx = (processError as any)?.context;
        if (ctx && typeof ctx?.json === "function") {
          try {
            const payload = await ctx.json();
            message = payload?.message || message;
          } catch {
            // ignore
          }
        }
        throw new Error(message);
      }

      return processData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["periods"] });

      const stats = data?.stats;
      let description = `${stats?.newTransactions || 0} transacciones nuevas`;
      if (stats?.duplicatesIgnored > 0) {
        description += `, ${stats.duplicatesIgnored} duplicados ignorados`;
      }
      toast.success(`Archivo reprocesado: ${description}`);
    },
    onError: (error) => {
      console.error("Error retrying import:", error);
      toast.error(error instanceof Error ? error.message : "Error al reintentar");
    },
  });

  const getImportsByMonth = (monthKey: string): Import[] => {
    return imports.filter(i => {
      // Use target_month from period, normalize both to YYYY-MM
      const importMonth = (i.target_month || i.uploaded_at.substring(0, 7)).substring(0, 7);
      return importMonth === monthKey.substring(0, 7);
    });
  };

  // Group imports by target month (from period.month_key)
  const importsByMonth = imports.reduce((acc, imp) => {
    // Use target_month from period, normalize to YYYY-MM
    const monthKey = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(imp);
    return acc;
  }, {} as Record<string, Import[]>);

  return {
    imports,
    importsByMonth,
    isLoading,
    error,
    processImport: processImport.mutateAsync,
    deleteImport: deleteImport.mutate,
    retryImport: retryImport.mutate,
    isProcessing: processImport.isPending,
    isDeleting: deleteImport.isPending,
    isRetrying: retryImport.isPending,
    getImportsByMonth
  };
}
