import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalize } from "@/lib/userRules";

export interface Suggestion {
  key: string;
  pattern: string;
  movement: string;
  count: number;
  totalAmount: number;
  transactionIds: string[];
  matchedTransactions: { id: string; date: string }[];
  categoryIds: string[];
}

const MIN_OCCURRENCES = 2;
const MAX_SUGGESTIONS = 15;

export function useSuggestions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["suggestions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, description_norm, movement, category_id, date, amount")
        .eq("user_id", user!.id)
        .in("categorized_by", ["ai", "sign_fallback"])
        .order("date", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const groups = new Map<string, Suggestion & { _catSet: Set<string> }>();
      for (const tx of data || []) {
        const raw = (tx.description_norm || tx.description || "").trim();
        if (!raw || !tx.movement) continue;
        const key = `${normalize(raw)}|${tx.movement}`;
        const existing = groups.get(key);
        if (existing) {
          existing.count++;
          existing.totalAmount += Math.abs(tx.amount);
          existing.transactionIds.push(tx.id);
          existing.matchedTransactions.push({ id: tx.id, date: tx.date as string });
          if (tx.category_id) existing._catSet.add(tx.category_id as string);
        } else {
          const catSet = new Set<string>();
          if (tx.category_id) catSet.add(tx.category_id as string);
          groups.set(key, {
            key,
            pattern: tx.description || tx.description_norm || raw,
            movement: tx.movement,
            count: 1,
            totalAmount: Math.abs(tx.amount),
            transactionIds: [tx.id],
            matchedTransactions: [{ id: tx.id, date: tx.date as string }],
            categoryIds: [],
            _catSet: catSet,
          });
        }
      }

      return [...groups.values()]
        .map(({ _catSet, ...rest }) => ({ ...rest, categoryIds: [..._catSet] }))
        .filter((g) => g.count >= MIN_OCCURRENCES)
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_SUGGESTIONS);
    },
    staleTime: 60_000,
  });
}
