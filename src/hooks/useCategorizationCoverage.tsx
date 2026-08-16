import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCategorizationCoverage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categorization-coverage", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_categorization_coverage", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      const row = data?.[0];
      if (!row) return { total: 0, highConfidence: 0, percent: 100 };
      return {
        total: Number(row.total),
        highConfidence: Number(row.high_confidence),
        percent: Number(row.percent),
      };
    },
    staleTime: 60_000,
  });
}
