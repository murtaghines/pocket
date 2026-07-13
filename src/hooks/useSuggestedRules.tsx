import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalize } from "@/lib/userRules";

export interface SuggestedRule {
  key: string;
  /** Representative raw description used to build the rule (fed to buildRuleFromCorrection). */
  pattern: string;
  movement: string;
  count: number;
  transactionIds: string[];
}

const MIN_OCCURRENCES = 3;
const MAX_SUGGESTIONS = 10;

/**
 * Surfaces recurring description patterns that fell through to the AI baseline
 * (categorized_by = 'ai' — neither the local categorizer nor a user_rule matched them).
 * Once a rule is created for a group, its transactions flip to categorized_by = 'user_rule'
 * and drop out of this query on the next fetch — no separate dismiss-tracking needed.
 */
export function useSuggestedRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["suggested-rules", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, description_norm, movement")
        .eq("user_id", user!.id)
        .eq("categorized_by", "ai")
        .order("date", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const groups = new Map<string, SuggestedRule>();
      for (const tx of data || []) {
        const raw = (tx.description_norm || tx.description || "").trim();
        if (!raw || !tx.movement) continue;
        const key = `${normalize(raw)}|${tx.movement}`;
        const existing = groups.get(key);
        if (existing) {
          existing.count++;
          existing.transactionIds.push(tx.id);
        } else {
          groups.set(key, {
            key,
            pattern: tx.description || tx.description_norm || raw,
            movement: tx.movement,
            count: 1,
            transactionIds: [tx.id],
          });
        }
      }

      return [...groups.values()]
        .filter((g) => g.count >= MIN_OCCURRENCES)
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_SUGGESTIONS);
    },
    staleTime: 60_000,
  });
}
