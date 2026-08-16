import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Transaction } from "@/lib/mockData";
import { getAccountDisplayName } from "@/lib/accountColors";
import type { Database } from "@/integrations/supabase/types";

type AppDomain = Database["public"]["Enums"]["app_domain"];
type MovementType = Database["public"]["Enums"]["movement_type"];

interface DbTransaction {
  id: string;
  user_id: string;
  import_id: string | null;
  period_id: string | null;
  date: string;
  description: string;
  description_norm: string | null;
  amount: number;
  movement: MovementType | null;
  category: string;
  category_id: string | null;
  currency: string | null;
  created_at: string;
  fingerprint: string | null;
  domain: AppDomain | null;
  account_id: string | null;
  running_balance: number | null;
  user_corrected: boolean | null;
}

interface UseTransactionsOptions {
  domain?: AppDomain;
  periodId?: string;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { domain = "CASHFLOW", periodId } = options;
  const { user } = useAuth();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["transactions", user?.id, domain, periodId],
    queryFn: async () => {
      if (!user) return [];

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, name, institution")
        .eq("user_id", user.id);

      const accountMap: Record<string, string> = {};
      (accountsData || []).forEach(a => { accountMap[a.id] = getAccountDisplayName(a); });

      let query = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("domain", domain)
        .eq("is_hidden", false)
        .order("date", { ascending: false });

      if (periodId) {
        query = query.eq("period_id", periodId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as DbTransaction[]).map((t): Transaction => {
        const rawDesc = t.description_norm || t.description;
        const cleanDesc = rawDesc.replace(
          /^value date:\s*\d{1,2}\s+\w{3}\s+\d{4}\s+/i,
          ''
        ).trim() || rawDesc;

        const movement = t.movement;

        const movementToType: Record<string, "income" | "expense" | "transfer"> = {
          INCOME: "income",
          EXPENSE: "expense",
          TRANSFER: "transfer",
        };

        const type = movement ? movementToType[movement] : "expense";

        const finalCategory = t.category;
        const accountName = t.account_id ? accountMap[t.account_id] || "Unknown" : "Unknown";

        return {
          id: t.id,
          date: t.date,
          description: cleanDesc,
          amount: t.amount,
          currency: t.currency || "EUR",
          type,
          movement,
          category: finalCategory as Transaction["category"],
          categorySlug: finalCategory,
          account: accountName,
          bank: accountName,
          account_id: t.account_id,
          runningBalance: t.running_balance,
          userCorrected: t.user_corrected ?? false,
        };
      });
    },
    enabled: !!user,
  });

  const transfers = transactions.filter((t) => t.movement === "TRANSFER");
  const investmentMovements = transactions.filter(
    (t) => t.categorySlug === "to_investment"
  );

  return {
    transactions,
    transfers,
    investmentMovements,
    isLoading,
    error,
    hasData: transactions.length > 0,
    transfersCount: transfers.length,
    investmentMovementsCount: investmentMovements.length,
  };
}
