import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CategoryTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  account_name: string | null;
}

export function useCategoryTransactions(categoryId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["category-transactions", user?.id, categoryId],
    enabled: !!user?.id && !!categoryId,
    queryFn: async () => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, description, amount, accounts(name, institution)")
        .eq("user_id", user!.id)
        .eq("category_id", categoryId!)
        .gte("date", monthStart)
        .eq("is_hidden", false)
        .order("date", { ascending: false })
        .limit(3);

      if (error) throw error;

      return (data || []).map((tx: any): CategoryTransaction => ({
        id: tx.id,
        date: tx.date,
        description: tx.description || "",
        amount: tx.amount,
        account_name: tx.accounts?.institution
          ? `${tx.accounts.institution} · ${tx.accounts.name}`
          : tx.accounts?.name || null,
      }));
    },
    staleTime: 30_000,
  });
}
