import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ruleMatchesDescription, type MatchType } from "@/lib/userRules";

interface UseRulePreviewArgs {
  matchType: MatchType;
  pattern: string;
  tokens: string[];
  movement: string;
  enabled?: boolean;
}

/**
 * Live preview: which existing transactions would a rule match? Also drives
 * retroactive apply — callers should update exactly this set (same matcher, same
 * data) so the "will match" count shown to the user can never drift from what
 * actually gets updated.
 */
export function useRulePreview({ matchType, pattern, tokens, movement, enabled = true }: UseRulePreviewArgs) {
  const { data: matchingIds = [], isFetching } = useQuery({
    queryKey: ["rule-preview", matchType, pattern, tokens.join("|"), movement],
    enabled: enabled && pattern.trim().length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as string[];
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, description_norm, movement, categorized_by")
        .eq("user_id", user.id)
        .limit(1500);
      if (error) return [] as string[];
      const matched: string[] = [];
      for (const row of data || []) {
        if (row.movement && row.movement !== movement) continue;
        // Don't clobber rows the user (or a prior rule) already deliberately set.
        if (row.categorized_by === "user" || row.categorized_by === "user_rule") continue;
        const desc = (row.description_norm || row.description || "") as string;
        if (ruleMatchesDescription(matchType, pattern, tokens, desc)) {
          matched.push(row.id);
        }
      }
      return matched;
    },
  });

  return { matchingIds, count: matchingIds.length, isLoading: isFetching };
}
