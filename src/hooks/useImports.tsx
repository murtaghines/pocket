import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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
      
      let query = supabase
        .from('imports')
        .select('*')
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

      return (data || []) as Import[];
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

  const getImportsByMonth = (monthKey: string): Import[] => {
    return imports.filter(i => {
      // Extract month from the uploaded_at or check period
      const importMonth = i.uploaded_at.substring(0, 7);
      return importMonth === monthKey;
    });
  };

  // Group imports by target month (derived from period)
  const importsByMonth = imports.reduce((acc, imp) => {
    // We need to get month from period - for now use uploaded_at month
    // This will be improved when periods are linked
    const monthKey = imp.uploaded_at.substring(0, 7);
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
    isProcessing: processImport.isPending,
    isDeleting: deleteImport.isPending,
    getImportsByMonth
  };
}
