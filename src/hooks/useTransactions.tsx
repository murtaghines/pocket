import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Transaction } from "@/lib/mockData";
import { getAccountDisplayName } from "@/lib/accountColors";
import type { Database } from "@/integrations/supabase/types";

type AppDomain = Database["public"]["Enums"]["app_domain"];
type MovementType = Database["public"]["Enums"]["movement_type"];

interface DbTransaction {
  id: string;
  date: string;
  description: string;
  description_norm: string | null;
  amount: number;
  movement: MovementType | null;
  category: string;
  currency: string | null;
  account_id: string | null;
  running_balance: number | null;
  user_corrected: boolean | null;
}

const TX_COLUMNS = "id, date, description, description_norm, amount, movement, category, currency, account_id, running_balance, user_corrected" as const;

interface UseTransactionsOptions {
  domain?: AppDomain;
  periodId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { domain = "CASHFLOW", periodId, startDate, endDate, page, pageSize = 100 } = options;
  const { user } = useAuth();

  const { data: result = { rows: [], count: null }, isLoading, error } = useQuery({
    queryKey: ["transactions", user?.id, domain, periodId, startDate, endDate, page, pageSize],
    queryFn: async () => {
      if (!user) return { rows: [], count: null };

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, name, institution")
        .eq("user_id", user.id);

      const accountMap: Record<string, string> = {};
      (accountsData || []).forEach(a => { accountMap[a.id] = getAccountDisplayName(a); });

      const selectOpts = page != null ? { count: 'exact' as const } : {};
      let query = supabase
        .from("transactions")
        .select(TX_COLUMNS, selectOpts)
        .eq("user_id", user.id)
        .eq("domain", domain)
        .eq("is_hidden", false)
        .order("date", { ascending: false });

      if (periodId) query = query.eq("period_id", periodId);
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);

      if (page != null) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const rows = (data as DbTransaction[]).map((t): Transaction => {
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

      return { rows, count: count ?? null };
    },
    enabled: !!user,
  });

  const transactions = result.rows;
  const transfers = useMemo(() => transactions.filter((t) => t.movement === "TRANSFER"), [transactions]);
  const investmentMovements = useMemo(() => transactions.filter(
    (t) => t.categorySlug === "to_investment"
  ), [transactions]);

  return {
    transactions,
    transfers,
    investmentMovements,
    isLoading,
    error,
    hasData: transactions.length > 0,
    transfersCount: transfers.length,
    investmentMovementsCount: investmentMovements.length,
    totalCount: result.count,
  };
}
