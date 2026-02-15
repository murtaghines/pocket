import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Transaction, MonthlyData, Category } from "@/lib/mockData";
import { getCategoryLabel, categoryColors as categoryColorVars } from "@/lib/categoryTranslations";
import type { Database } from "@/integrations/supabase/types";

// Helper function to get HSL color from CSS variable name
function getCategoryHslColor(categorySlug: string): string {
  const varName = categoryColorVars[categorySlug];
  if (!varName) return "hsl(220, 10%, 55%)";
  
  // Try to get the CSS variable value from the document
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    const hslValue = getComputedStyle(root).getPropertyValue(`--${varName}`).trim();
    if (hslValue) {
      return `hsl(${hslValue})`;
    }
  }
  
  // Fallback colors if CSS variable is not available
  const fallbackColors: Record<string, string> = {
    'category-salary': 'hsl(142, 76%, 36%)',
    'category-refunds': 'hsl(199, 89%, 48%)',
    'category-transfers': 'hsl(220, 14%, 50%)',
    'category-other-income': 'hsl(160, 60%, 45%)',
    'category-investment': 'hsl(262, 83%, 58%)',
    'category-freelance': 'hsl(280, 65%, 60%)',
    'category-rents': 'hsl(45, 93%, 47%)',
    'category-housing': 'hsl(25, 95%, 53%)',
    'category-groceries': 'hsl(142, 71%, 45%)',
    'category-restaurants': 'hsl(12, 76%, 61%)',
    'category-transport': 'hsl(217, 91%, 60%)',
    'category-health': 'hsl(340, 82%, 52%)',
    'category-entertainment': 'hsl(280, 87%, 65%)',
    'category-shopping': 'hsl(326, 78%, 60%)',
    'category-education': 'hsl(199, 89%, 48%)',
    'category-subscriptions': 'hsl(262, 83%, 58%)',
    'category-travel': 'hsl(45, 93%, 47%)',
    'category-sports': 'hsl(174, 72%, 40%)',
    'category-other-expense': 'hsl(220, 9%, 46%)',
    'category-pets': 'hsl(32, 95%, 44%)',
    'category-own-transfer': 'hsl(220, 14%, 50%)',
    'category-to-investment': 'hsl(262, 83%, 58%)',
  };
  
  return fallbackColors[varName] || "hsl(220, 10%, 55%)";
}

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
        // Clean description: strip "value date: DD mmm YYYY " prefix
        const rawDesc = t.description_norm || t.description;
        const cleanDesc = rawDesc.replace(
          /^value date:\s*\d{1,2}\s+\w{3}\s+\d{4}\s+/i,
          ''
        ).trim() || rawDesc;

        // Determine movement: trust DB movement, but fix mismatches
        // If amount is positive and movement says EXPENSE, override to INCOME
        // If amount is negative and movement says INCOME, override to EXPENSE
        let movement = t.movement;
        if (t.amount > 0 && movement === 'EXPENSE') {
          movement = 'INCOME';
        } else if (t.amount < 0 && movement === 'INCOME') {
          movement = 'EXPENSE';
        }

        // Map movement to legacy type for backward compatibility
        const movementToType: Record<string, "income" | "expense" | "transfer"> = {
          INCOME: "income",
          EXPENSE: "expense", 
          TRANSFER: "transfer",
        };
        
        const type = movement 
          ? movementToType[movement] || t.type
          : t.type;

        return {
          id: t.id,
          date: t.date,
          description: cleanDesc,
          amount: t.amount_base || t.amount,
          currency: t.currency || "EUR",
          type,
          movement,
          category: t.category as Category,
          categorySlug: t.category,
          account: "Main Account",
          bank: t.bank || "Unknown",
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

    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        return {
          month: key,
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
      name: getCategoryLabel(category),
      value: Math.round(value * 100) / 100,
      category: category as Category,
      color: getCategoryHslColor(category),
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
