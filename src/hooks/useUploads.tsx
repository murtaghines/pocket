import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppDomain = Database["public"]["Enums"]["app_domain"];

export interface Upload {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  status: string;
  transactions_count: number | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  target_month: string | null;
  domain: AppDomain;
}

export function useUploads(domain?: AppDomain) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ["uploads", user?.id, domain],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("uploads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Filter by domain if specified
      if (domain) {
        query = query.eq("domain", domain);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Upload[];
    },
    enabled: !!user,
  });

  const deleteUploadMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      if (!user) throw new Error("No user");

      // Get the upload first to get file path and domain
      const { data: upload, error: fetchError } = await supabase
        .from("uploads")
        .select("file_path, domain")
        .eq("id", uploadId)
        .single();

      if (fetchError) throw fetchError;

      // Delete associated data based on domain
      if (upload?.domain === "INVESTING") {
        // Delete associated investments
        const { error: invError } = await supabase
          .from("investments")
          .delete()
          .eq("upload_id", uploadId);

        if (invError) throw invError;
      } else {
        // Delete associated transactions (CASHFLOW)
        const { error: txError } = await supabase
          .from("transactions")
          .delete()
          .eq("upload_id", uploadId);

        if (txError) throw txError;
      }

      // Delete from storage
      if (upload?.file_path) {
        await supabase.storage
          .from("financial-files")
          .remove([upload.file_path]);
      }

      // Delete upload record
      const { error: deleteError } = await supabase
        .from("uploads")
        .delete()
        .eq("id", uploadId);

      if (deleteError) throw deleteError;

      // Run integrity check after deletion
      const { error: integrityError } = await supabase.functions.invoke(
        "check-data-integrity",
        { body: { userId: user.id } }
      );

      if (integrityError) {
        console.error("Integrity check error:", integrityError);
      }

      return uploadId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({
        title: "File deleted",
        description: "The file and its data have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group uploads by month
  const uploadsByMonth = uploads.reduce((acc, upload) => {
    const date = new Date(upload.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    
    if (!acc[monthKey]) {
      acc[monthKey] = { label: monthLabel, uploads: [] };
    }
    acc[monthKey].uploads.push(upload);
    return acc;
  }, {} as Record<string, { label: string; uploads: Upload[] }>);

  return {
    uploads,
    uploadsByMonth,
    isLoading,
    deleteUpload: deleteUploadMutation.mutate,
    isDeleting: deleteUploadMutation.isPending,
  };
}
