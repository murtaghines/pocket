import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RuleOverride {
  type: "rule_override";
  targetCategoryId: string;
  targetCategorySlug: string;
  keywords: string[];
}

export interface CustomCategoryRule {
  type: "custom_category";
  slug: string;
  name: string;
  movement: "INCOME" | "EXPENSE";
  keywords: string[];
  color?: string;
  icon?: string;
}

export type CategoryRule = RuleOverride | CustomCategoryRule;

export function useCustomCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["custom_category_rules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("custom_category_rules")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return ((data?.custom_category_rules as unknown) as CategoryRule[] | null) ?? [];
    },
    enabled: !!user?.id,
  });

  const saveRules = useMutation({
    mutationFn: async (newRules: CategoryRule[]) => {
      if (!user?.id) throw new Error("No user");
      const { error } = await supabase
        .from("profiles")
        .update({ custom_category_rules: newRules as any })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_category_rules", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  const addRuleOverride = (override: Omit<RuleOverride, "type">) => {
    const newRules = [...rules, { type: "rule_override" as const, ...override }];
    return saveRules.mutateAsync(newRules);
  };

  const addCustomCategory = (category: Omit<CustomCategoryRule, "type">) => {
    const newRules = [...rules, { type: "custom_category" as const, ...category }];
    return saveRules.mutateAsync(newRules);
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    return saveRules.mutateAsync(newRules);
  };

  const updateRule = (index: number, updated: CategoryRule) => {
    const newRules = [...rules];
    newRules[index] = updated;
    return saveRules.mutateAsync(newRules);
  };

  const ruleOverrides = rules.filter((r): r is RuleOverride => r.type === "rule_override");
  const customCategories = rules.filter((r): r is CustomCategoryRule => r.type === "custom_category");

  return {
    rules,
    ruleOverrides,
    customCategories,
    isLoading,
    isSaving: saveRules.isPending,
    addRuleOverride,
    addCustomCategory,
    removeRule,
    updateRule,
  };
}
