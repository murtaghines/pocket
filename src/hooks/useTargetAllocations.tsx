import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TargetAllocation {
  id: string;
  user_id: string;
  asset_class: string;
  target_pct: number;
  created_at: string;
  updated_at: string;
}

export function useTargetAllocations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["target-allocations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("target_allocations")
        .select("*")
        .eq("user_id", user!.id)
        .order("target_pct", { ascending: false });
      if (error) throw error;
      return data as TargetAllocation[];
    },
    enabled: !!user,
  });

  const upsertTarget = useMutation({
    mutationFn: async ({
      asset_class,
      target_pct,
    }: {
      asset_class: string;
      target_pct: number;
    }) => {
      const { error } = await supabase.from("target_allocations").upsert(
        {
          user_id: user!.id,
          asset_class,
          target_pct,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,asset_class" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["target-allocations"] });
    },
  });

  const deleteTarget = useMutation({
    mutationFn: async (asset_class: string) => {
      const { error } = await supabase
        .from("target_allocations")
        .delete()
        .eq("user_id", user!.id)
        .eq("asset_class", asset_class);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["target-allocations"] });
    },
  });

  const targetMap = Object.fromEntries(
    targets.map((t) => [t.asset_class, t.target_pct])
  );

  const totalTargetPct = targets.reduce((sum, t) => sum + t.target_pct, 0);

  return {
    targets,
    targetMap,
    totalTargetPct,
    isLoading,
    upsertTarget,
    deleteTarget,
  };
}
