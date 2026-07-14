import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalize } from "@/lib/userRules";

export interface ReviewGroup {
  key: string;
  pattern: string;
  movement: string;
  category: string;
  confidence: number;
  count: number;
  totalAmount: number;
  transactionIds: string[];
}

const MAX_GROUPS = 15;

export function useReviewQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["review-queue", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, description_norm, movement, category, amount, confidence")
        .eq("user_id", user!.id)
        .lt("confidence", 0.5)
        .eq("is_hidden", false)
        .order("date", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const groups = new Map<string, ReviewGroup>();
      for (const tx of data || []) {
        const raw = (tx.description_norm || tx.description || "").trim();
        if (!raw || !tx.movement) continue;
        const key = `${normalize(raw)}|${tx.movement}`;
        const existing = groups.get(key);
        if (existing) {
          existing.count++;
          existing.totalAmount += Math.abs(tx.amount);
          existing.transactionIds.push(tx.id);
        } else {
          groups.set(key, {
            key,
            pattern: tx.description || tx.description_norm || raw,
            movement: tx.movement,
            category: tx.category,
            confidence: tx.confidence ?? 0,
            count: 1,
            totalAmount: Math.abs(tx.amount),
            transactionIds: [tx.id],
          });
        }
      }

      return [...groups.values()]
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, MAX_GROUPS);
    },
    staleTime: 60_000,
  });
}
