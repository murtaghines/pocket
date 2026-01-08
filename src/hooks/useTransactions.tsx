import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Transaction, MonthlyData, Category } from "@/lib/mockData";
import { categoryColors } from "@/lib/mockData";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import type { Database } from "@/integrations/supabase/types";

type AppDomain = Database["public"]["Enums"]["app_domain"];
type MovementType = Database["public"]["Enums"]["movement_type"];

interface DbTransaction {
  id: string;
  user_id: string;
  upload_id: string | null;
  import_id: string | null;
  period_id: string | null;
  date: string;
  description: string;
  description_norm: string | null;
  amount: number;
  amount_base: number | null;
  type: "income" | "expense" | "transfer";
  tx_type: string | null;
  movement: MovementType | null;
  category: string;
  category_id: string | null;
  bank: string | null;
  currency: string | null;
  original_text: string | null;
  created_at: string;
  transaction_hash: string | null;
  fingerprint: string | null;
  linked_transaction_id: string | null;
  domain: AppDomain | null;
  account_id: string | null;
}

interface UseTransactionsOptions {
  domain?: AppDomain;
  periodId?: string;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { domain = "CASHFLOW", periodId } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["transactions", user?.id, domain, periodId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("domain", domain)
        .order("date", { ascending: false });

      if (periodId) {
        query = query.eq("period_id", periodId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform DB transactions to app format
      return (data as DbTransaction[]).map((t): Transaction => {
        // Map movement to legacy type for backward compatibility
        const movementToType: Record<string, "income" | "expense" | "transfer"> = {
          INCOME: "income",
          EXPENSE: "expense", 
          TRANSFER: "transfer",
        };
        
        const type = t.movement 
          ? movementToType[t.movement] || t.type
          : t.type;

        return {
          id: t.id,
          date: t.date,
          description: t.description_norm || t.description,
          amount: t.amount_base || t.amount,
          currency: t.currency || "EUR",
          type,
          movement: t.movement,
          category: t.category as Category,
          categorySlug: t.category,
          account: "Cuenta Principal",
          bank: t.bank || "Desconocido",
        };
      });
    },
    enabled: !!user,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  // Filter out transfers for financial calculations (use movement field)
  const financialTransactions = transactions.filter(
    (t) => (t.movement ? t.movement !== "TRANSFER" : t.type !== "transfer")
  );
  const transfers = transactions.filter(
    (t) => t.movement === "TRANSFER" || t.type === "transfer"
  );
  const investmentMovements = transactions.filter(
    (t) => t.categorySlug === "to_investment"
  );

  // Calculate monthly data from transactions (excluding transfers)
  const monthlyData: MonthlyData[] = (() => {
    if (!financialTransactions.length) return [];

    const monthlyTotals: Record<string, { income: number; expenses: number }> = {};
    
    financialTransactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expenses: 0 };
      }
      
      const isIncome = t.movement === "INCOME" || t.type === "income";
      if (isIncome) {
        monthlyTotals[monthKey].income += Math.abs(t.amount);
      } else {
        monthlyTotals[monthKey].expenses += Math.abs(t.amount);
      }
    });

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [, month] = key.split("-");
        return {
          month: monthNames[parseInt(month) - 1],
          income: Math.round(data.income * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100,
          balance: Math.round((data.income - data.expenses) * 100) / 100,
        };
      });
  })();

  // Calculate category expenses (excluding transfers)
  const categoryData = (() => {
    const expenses = financialTransactions.filter(
      (t) => t.movement === "EXPENSE" || t.type === "expense"
    );
    const categoryTotals: Record<string, number> = {};
    
    expenses.forEach((t) => {
      const categoryKey = t.categorySlug || t.category;
      const absAmount = Math.abs(t.amount);
      categoryTotals[categoryKey] = (categoryTotals[categoryKey] || 0) + absAmount;
    });
    
    return Object.entries(categoryTotals).map(([category, value]) => ({
      name: getCategoryLabel(category, 'es'),
      value: Math.round(value * 100) / 100,
      category: category as Category,
      color: categoryColors[category as Category] || "hsl(220, 10%, 55%)",
    }));
  })();

  // Calculate bank expenses (excluding transfers)
  const bankData = (() => {
    const expenses = financialTransactions.filter(
      (t) => t.movement === "EXPENSE" || t.type === "expense"
    );
    const bankTotals: Record<string, number> = {};
    
    expenses.forEach((t) => {
      const absAmount = Math.abs(t.amount);
      bankTotals[t.bank] = (bankTotals[t.bank] || 0) + absAmount;
    });
    
    return Object.entries(bankTotals).map(([bank, value]) => ({
      name: bank,
      value: Math.round(value * 100) / 100,
    }));
  })();

  // Calculate month summary (excluding transfers)
  const summary = (() => {
    const income = financialTransactions
      .filter((t) => t.movement === "INCOME" || t.type === "income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const expenses = financialTransactions
      .filter((t) => t.movement === "EXPENSE" || t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return {
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      balance: Math.round((income - expenses) * 100) / 100,
    };
  })();

  return {
    transactions,
    transfers,
    investmentMovements,
    monthlyData,
    categoryData,
    bankData,
    summary,
    isLoading,
    error,
    deleteTransaction,
    hasData: transactions.length > 0,
    transfersCount: transfers.length,
    investmentMovementsCount: investmentMovements.length,
  };
}
