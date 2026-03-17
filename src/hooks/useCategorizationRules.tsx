import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Rule = Database["public"]["Tables"]["categorization_rules"]["Row"];

export function useCategorizationRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["categorization_rules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorization_rules")
        .select("*")
        .eq("user_id", user!.id)
        .eq("domain", "CASHFLOW")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as Rule[];
    },
    enabled: !!user?.id,
  });

  const addRule = useMutation({
    mutationFn: async (rule: {
      category_id: string;
      pattern: string;
      match_type: string;
      match_field: string;
    }) => {
      const { error } = await supabase.from("categorization_rules").insert({
        user_id: user!.id,
        domain: "CASHFLOW" as const,
        category_id: rule.category_id,
        pattern: rule.pattern,
        match_type: rule.match_type,
        match_field: rule.match_field === 'description' ? 'description_norm' : rule.match_field,
        priority: 100,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorization_rules"] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("categorization_rules")
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorization_rules"] }),
  });

  const getRulesForCategory = (categoryId: string): Rule[] => {
    return rules.filter((r) => r.category_id === categoryId);
  };

  return { rules, isLoading, addRule, deleteRule, getRulesForCategory };
}
