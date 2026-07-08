import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/fileExtract";

export type ImportStatus = 'UPLOADED' | 'PARSED' | 'NORMALIZED' | 'FAILED' | 'PARTIAL';
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
  locked?: boolean;
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
        const message = payload?.message || 'Error processing file';

        // Create error with code for special handling
        const err = new Error(message);
        (err as any).code = code;
        throw err;
      }
      
      // Check for error in successful response body
      if (data?.error === 'duplicate_file') {
        throw new Error(data.message || 'This file has already been imported');
      }

      if (data?.error === 'period_closed') {
        throw new Error(data.message || 'The period is closed');
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
        toast.warning(`${data.message}. ${data.dateWarnings.length} transactions with dates outside the month.`);
      } else {
        toast.success(data.message);
      }
    },
    onError: (error: any) => {
      console.error('Error processing import:', error);
      const code = error?.code || "";
      const message = error?.message || "Error processing file";
      
      if (code === "payment_required") {
        toast.error("AI service unavailable", {
          description: "The AI service is temporarily unavailable. Please try again later.",
        });
      } else if (code === "rate_limited") {
        toast.error("Too many requests", {
          description: "Wait a few minutes and try again.",
        });
      } else {
        toast.error(message);
      }
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

      // Log to audit (server-validated)
      if (user?.id) {
        await supabase.rpc('log_audit_event', {
          _entity_type: 'import',
          _entity_id: importId,
          _action: 'delete',
          _diff: { deleted_at: new Date().toISOString() },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('File deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting import:', error);
      toast.error('Error deleting file');
    }
  });

  const toggleLockImport = useMutation({
    mutationFn: async ({ importId, locked }: { importId: string; locked: boolean }) => {
      const { error } = await supabase
        .from('imports')
        .update({ locked } as any)
        .eq('id', importId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
    onError: () => {
      toast.error('Could not update file lock');
    }
  });

  // Auto-delete failed imports
  const autoDeleteFailedImport = async (importId: string) => {
    try {
      // Delete related transactions first
      await supabase
        .from("transactions")
        .delete()
        .eq("import_id", importId);

      // Delete the import record
      await supabase
        .from("imports")
        .delete()
        .eq("id", importId);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (error) {
      console.error("Error auto-deleting failed import:", error);
    }
  };

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
    autoDeleteFailedImport,
    isProcessing: processImport.isPending,
    isDeleting: deleteImport.isPending,
    toggleLockImport: toggleLockImport.mutate,
    isTogglingLock: toggleLockImport.isPending,
    getImportsByMonth
  };
}
