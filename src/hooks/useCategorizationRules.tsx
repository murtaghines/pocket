import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { buildRuleFromCorrection, extractKeyTokens, normalize } from "@/lib/userRules";

// UI-facing shape. Mirrors the previous categorization_rules row so consumers
// (CategoriesEditor, CategoryRulesList) can stay unchanged. `category_id` is
// resolved from `user_rules.category` (slug) via the categories table.
export interface Rule {
  id: string;
  category_id: string;
  pattern: string;
  match_type: string;
  match_field: string;
  applied_count: number;
  last_applied_at: string | null;
}

// UI match_types (uppercase, historical) → user_rules match_types (lowercase).
// SMART is the recommended default: it stores tokens and matches when all
// meaningful tokens appear in the description.
export const UI_TO_DB_MATCH_TYPE: Record<string, string> = {
  SMART: 'fuzzy',
  CONTAINS: 'contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  EXACT: 'exact',
  REGEX: 'regex',
};

const DB_TO_UI_MATCH_TYPE: Record<string, string> = {
  fuzzy: 'SMART',
  contains: 'CONTAINS',
  starts_with: 'STARTS_WITH',
  ends_with: 'ENDS_WITH',
  exact: 'EXACT',
  regex: 'REGEX',
};

/** Resolves a UI match type + raw pattern into the fields user_rules actually stores.
 *  Shared by the addRule mutation and AddRuleDialog's live preview so the preview's
 *  "will match N transactions" count is computed against the exact pattern/tokens that
 *  end up saved — never a divergent approximation. */
export function buildDbRuleFields(pattern: string, uiMatchType: string, movement: string, categorySlug: string) {
  const dbType = UI_TO_DB_MATCH_TYPE[uiMatchType] || uiMatchType.toLowerCase();
  let builtPattern = pattern;
  let tokens: string[] = [];
  if (dbType === 'fuzzy') {
    const mv = movement === 'INCOME' || movement === 'TRANSFER' ? movement : 'EXPENSE';
    const built = buildRuleFromCorrection(pattern, mv as 'INCOME' | 'EXPENSE' | 'TRANSFER', categorySlug);
    builtPattern = built.pattern;
    tokens = built.tokens;
    // Fall back to a contains-normalized pattern if nothing meaningful was extracted —
    // the row would otherwise never match (fuzzy requires >0 tokens).
    if (tokens.length === 0) {
      builtPattern = normalize(pattern);
      tokens = extractKeyTokens(pattern);
    }
  }
  return { dbType, pattern: builtPattern, tokens };
}

export function useCategorizationRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { incomeCategories, expenseCategories, transferCategories } = useCategories('CASHFLOW');

  const allCategories = [...incomeCategories, ...expenseCategories, ...transferCategories];
  const slugToId: Record<string, string> = {};
  const idToCategory: Record<string, { slug: string; movement: string }> = {};
  for (const c of allCategories) {
    if (c.slug) slugToId[c.slug] = c.id;
    idToCategory[c.id] = { slug: c.slug || '', movement: (c.movement_type as string) || 'EXPENSE' };
  }

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["user_rules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_rules")
        .select("id, pattern, match_type, category, applied_count, last_applied_at")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r): Rule => ({
        id: r.id,
        category_id: slugToId[r.category] || '',
        pattern: r.pattern,
        match_type: DB_TO_UI_MATCH_TYPE[r.match_type] || r.match_type.toUpperCase(),
        match_field: 'description_norm',
        applied_count: r.applied_count ?? 0,
        last_applied_at: r.last_applied_at,
      }));
    },
    enabled: !!user?.id && allCategories.length > 0,
  });

  const addRule = useMutation({
    mutationFn: async (rule: {
      category_id: string;
      pattern: string;
      match_type: string;
      match_field?: string;
      /** IDs of existing transactions the rule matches, for retroactive apply. */
      matchingTransactionIds?: string[];
    }) => {
      const cat = idToCategory[rule.category_id];
      if (!cat) throw new Error(`Unknown category id: ${rule.category_id}`);
      const { dbType, pattern, tokens } = buildDbRuleFields(rule.pattern, rule.match_type, cat.movement, cat.slug);

      const { error } = await supabase.from("user_rules").insert({
        user_id: user!.id,
        source: 'manual',
        match_type: dbType,
        pattern,
        tokens,
        movement: cat.movement,
        category: cat.slug,
        confidence: 0.99,
      });
      if (error) throw error;

      if (rule.matchingTransactionIds && rule.matchingTransactionIds.length > 0) {
        const { error: retroError } = await supabase
          .from("transactions")
          .update({
            movement: cat.movement,
            category: cat.slug,
            category_id: rule.category_id,
            category_source: "USER_RULE",
            categorized_by: "user_rule",
          })
          .in("id", rule.matchingTransactionIds);
        if (retroError) throw retroError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_rules"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["month-transactions-inline"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
    },
  });

  const updateRule = useMutation({
    mutationFn: async (params: { ruleId: string; pattern: string; match_type: string }) => {
      const dbType = UI_TO_DB_MATCH_TYPE[params.match_type] || params.match_type.toLowerCase();
      let pattern = params.pattern;
      let tokens: string[] = [];
      if (dbType === 'fuzzy') {
        pattern = normalize(params.pattern);
        tokens = extractKeyTokens(params.pattern);
      }
      const { error } = await supabase
        .from("user_rules")
        .update({ pattern, tokens, match_type: dbType })
        .eq("id", params.ruleId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_rules"] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      // Soft-delete: keep the row for audit/history but exclude from active matching.
      const { error } = await supabase
        .from("user_rules")
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_rules"] }),
  });

  const getRulesForCategory = (categoryId: string): Rule[] => {
    return rules.filter((r) => r.category_id === categoryId);
  };

  return { rules, isLoading, addRule, updateRule, deleteRule, getRulesForCategory };
}
