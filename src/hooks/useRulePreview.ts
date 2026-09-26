import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ruleMatchesDescription, type MatchType } from "@/lib/userRules";

export interface MatchedTransaction {
  id: string;
  date: string;
}

interface UseRulePreviewArgs {
  matchType: MatchType;
  pattern: string;
  tokens: string[];
  movement: string;
  /** Single-account scope (legacy). Prefer `accountIds` for multi-account. */
  accountId?: string | null;
  /** Multi-account scope: null/undefined = all accounts, otherwise this subset. */
  accountIds?: string[] | null;
  enabled?: boolean;
}

/**
 * Live preview: which existing transactions would a rule match? Also drives
 * retroactive apply — callers should update exactly this set (same matcher, same
 * data) so the "will match" count shown to the user can never drift from what
 * actually gets updated.
 *
 * Returns matched transactions with dates so callers can group by time range
 * for granular retroactive apply.
 */
export function useRulePreview({ matchType, pattern, tokens, movement, accountId, accountIds, enabled = true }: UseRulePreviewArgs) {
  // Normalize scope: an explicit subset wins; else fall back to the single-account arg.
  const scopeIds = accountIds && accountIds.length > 0
    ? accountIds
    : (accountId ? [accountId] : null);
  const { data: matched = [], isFetching } = useQuery({
    queryKey: ["rule-preview", matchType, pattern, tokens.join("|"), movement, scopeIds ? scopeIds.join(",") : "all"],
    enabled: enabled && pattern.trim().length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as MatchedTransaction[];
      let query = supabase
        .from("transactions")
        .select("id, description, description_norm, movement, categorized_by, date, account_id")
        .eq("user_id", user.id)
        .limit(1500);
      if (scopeIds) {
        query = query.in("account_id", scopeIds);
      }
      const { data, error } = await query;
      if (error) return [] as MatchedTransaction[];
      const results: MatchedTransaction[] = [];
      for (const row of data || []) {
        if (row.movement && row.movement !== movement) continue;
        if (row.categorized_by === "user" || row.categorized_by === "user_rule") continue;
        const desc = (row.description_norm || row.description || "") as string;
        if (ruleMatchesDescription(matchType, pattern, tokens, desc)) {
          results.push({ id: row.id, date: row.date as string });
        }
      }
      return results;
    },
  });

  const matchingIds = matched.map(m => m.id);

  return { matched, matchingIds, count: matched.length, isLoading: isFetching };
}
