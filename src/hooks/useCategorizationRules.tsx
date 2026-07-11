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
}

// UI match_types (uppercase, historical) → user_rules match_types (lowercase).
// SMART is the recommended default: it stores tokens and matches when all
// meaningful tokens appear in the description.
const UI_TO_DB_MATCH_TYPE: Record<string, string> = {
  SMART: 'fuzzy',
  CONTAINS: 'contains',
  STARTS_WITH: 'starts_with',
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
        .select("id, pattern, match_type, category")
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
    }) => {
      const cat = idToCategory[rule.category_id];
      if (!cat) throw new Error(`Unknown category id: ${rule.category_id}`);
      const dbType = UI_TO_DB_MATCH_TYPE[rule.match_type] || rule.match_type.toLowerCase();

      let pattern = rule.pattern;
      let tokens: string[] = [];
      if (dbType === 'fuzzy') {
        const movement = cat.movement === 'INCOME' || cat.movement === 'TRANSFER' ? cat.movement : 'EXPENSE';
        const built = buildRuleFromCorrection(rule.pattern, movement as 'INCOME' | 'EXPENSE' | 'TRANSFER', cat.slug);
        pattern = built.pattern;
        tokens = built.tokens;
        // Fall back to a contains-normalized pattern if nothing meaningful was extracted —
        // the row would otherwise never match (fuzzy requires >0 tokens).
        if (tokens.length === 0) {
          pattern = normalize(rule.pattern);
          tokens = extractKeyTokens(rule.pattern);
        }
      }

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
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_rules"] }),
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
