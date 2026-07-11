import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CustomCategoryRule {
  type: "custom_category";
  slug: string;
  name: string;
  movement: "INCOME" | "EXPENSE";
  keywords: string[];
  color?: string;
  icon?: string;
}

export interface VisualOverride {
  type: "visual_override";
  categorySlug: string;
  color?: string;
  icon?: string;
}

// The `rule_override` shape existed but the UI never wrote it and the two consumers
// (useCustomCategories.addRuleOverride + process-import categoryRuleOverrides parsing)
// were dead — dropped in Fase 3 cleanup along with `ruleOverrides` and `updateRule` here.
export type CategoryRule = CustomCategoryRule | VisualOverride;

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

  const addCustomCategory = (category: Omit<CustomCategoryRule, "type">) => {
    const newRules = [...rules, { type: "custom_category" as const, ...category }];
    return saveRules.mutateAsync(newRules);
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    return saveRules.mutateAsync(newRules);
  };

  const customCategories = rules.filter((r): r is CustomCategoryRule => r.type === "custom_category");
  const visualOverrides = rules.filter((r): r is VisualOverride => r.type === "visual_override");

  const getVisualOverride = (slug: string): VisualOverride | undefined =>
    visualOverrides.find(v => v.categorySlug === slug);

  const setVisualOverride = (slug: string, color?: string, icon?: string) => {
    const existing = rules.findIndex(r => r.type === "visual_override" && (r as VisualOverride).categorySlug === slug);
    const override: VisualOverride = { type: "visual_override", categorySlug: slug, color, icon };
    if (existing >= 0) {
      const newRules = [...rules];
      newRules[existing] = override;
      return saveRules.mutateAsync(newRules);
    }
    return saveRules.mutateAsync([...rules, override]);
  };

  return {
    rules,
    customCategories,
    visualOverrides,
    isLoading,
    isSaving: saveRules.isPending,
    addCustomCategory,
    removeRule,
    getVisualOverride,
    setVisualOverride,
  };
}
