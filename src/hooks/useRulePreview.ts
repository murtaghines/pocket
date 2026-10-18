import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ruleMatchesDescription, normalize, type MatchType } from "@/lib/userRules";

function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

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

interface FindMatchingArgs {
  userId: string;
  matchType: MatchType;
  pattern: string;
  tokens: string[];
  movement: string;
  /** null/undefined = all accounts, otherwise this subset. */
  accountIds?: string[] | null;
  /** Skip the movement filter — find matches regardless of their current movement type. */
  skipMovementFilter?: boolean;
}

/**
 * Pure, hook-free version of the matching query — the single place both the dialog's live
 * preview (via useRulePreview below) and any imperative caller (e.g. the proactive rule
 * nudge, which runs inside a mutation's onSuccess and can't use a query hook) resolve "which
 * existing transactions would this rule match." Never duplicate this matching logic — the
 * "will match N transactions" number shown to the user must always come from here, so it can
 * never drift from what retroactive apply actually updates.
 */
export async function findMatchingTransactions({
  userId,
  matchType,
  pattern,
  tokens,
  movement,
  accountIds,
  skipMovementFilter,
}: FindMatchingArgs): Promise<MatchedTransaction[]> {
  if (!pattern.trim()) return [];
  type RawRow = { id: string; description: string | null; description_norm: string | null; movement: string | null; categorized_by: string | null; date: string | null; account_id: string | null };
  const PAGE_SIZE = 1000;
  let allRows: RawRow[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase
      .from("transactions")
      .select("id, description, description_norm, movement, categorized_by, date, account_id")
      .eq("user_id", userId)
      .range(offset, offset + PAGE_SIZE - 1);
    if (accountIds && accountIds.length > 0) {
      query = query.in("account_id", accountIds);
    }
    // Server-side pre-filter: push the heaviest filtering to the DB so we
    // transfer only candidate rows instead of the entire transaction history.
    // The client-side ruleMatchesDescription below is still the authoritative
    // match — this just narrows the dataset for scalability.
    if (matchType !== 'regex') {
      const source = matchType === 'fuzzy' ? tokens : normalize(pattern).split(/\s+/);
      const words = source.filter(w => w.length >= 3);
      if (words.length > 0) {
        const longest = words.reduce((a, b) => a.length >= b.length ? a : b);
        query = query.ilike('description_norm', `%${escapeIlike(longest)}%`);
      }
    }
    const { data, error } = await query;
    if (error) break;
    const page = (data || []) as RawRow[];
    allRows = allRows.concat(page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  const results: MatchedTransaction[] = [];
  for (const row of allRows) {
    if (!skipMovementFilter && row.movement && row.movement !== movement) {
      const isSignConflict =
        (movement === 'INCOME' && row.movement === 'EXPENSE') ||
        (movement === 'EXPENSE' && row.movement === 'INCOME');
      if (isSignConflict) continue;
    }
    if (row.categorized_by === "user") continue;
    const desc = (row.description_norm || row.description || "") as string;
    if (ruleMatchesDescription(matchType, pattern, tokens, desc)) {
      results.push({ id: row.id, date: row.date as string });
    }
  }
  return results;
}

/**
 * Does an active rule already exist for this exact pattern+category? Used to dedup rule
 * creation everywhere a rule might be auto-created or suggested — an existing rule already
 * covers the pattern, so there's nothing new to offer the user.
 */
export async function findExistingActiveRule({
  userId,
  pattern,
  category,
}: {
  userId: string;
  pattern: string;
  category: string;
}): Promise<string | undefined> {
  const { data } = await supabase
    .from("user_rules")
    .select("id")
    .eq("user_id", userId)
    .eq("pattern", pattern)
    .eq("category", category)
    .eq("is_active", true)
    .limit(1);
  return data && data.length > 0 ? data[0].id : undefined;
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
      return findMatchingTransactions({ userId: user.id, matchType, pattern, tokens, movement, accountIds: scopeIds });
    },
  });

  const matchingIds = matched.map(m => m.id);

  return { matched, matchingIds, count: matched.length, isLoading: isFetching };
}
