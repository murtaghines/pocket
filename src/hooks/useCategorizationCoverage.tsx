import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCategorizationCoverage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categorization-coverage", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("confidence")
        .eq("user_id", user!.id)
        .eq("is_hidden", false);
      if (error) throw error;

      const total = data?.length ?? 0;
      if (total === 0) return { total: 0, highConfidence: 0, percent: 100 };

      const highConfidence = data!.filter(
        (t) => t.confidence !== null && t.confidence >= 0.85,
      ).length;
      const nullConfidence = data!.filter((t) => t.confidence === null).length;
      const effectiveHigh = highConfidence + nullConfidence;

      return {
        total,
        highConfidence: effectiveHigh,
        percent: Math.round((effectiveHigh / total) * 100),
      };
    },
    staleTime: 60_000,
  });
}
