import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Transaction, MonthlyData, Category } from "@/lib/mockData";
import { categoryLabels, categoryColors } from "@/lib/mockData";

interface DbTransaction {
  id: string;
  user_id: string;
  upload_id: string | null;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  bank: string | null;
  original_text: string | null;
  created_at: string;
}

export function useTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      
      // Transform DB transactions to app format
      return (data as DbTransaction[]).map((t): Transaction => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        currency: "EUR",
        type: t.type,
        category: t.category as Category,
        account: "Cuenta Principal",
        bank: t.bank || "Desconocido",
      }));
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

  // Calculate monthly data from transactions
  const monthlyData: MonthlyData[] = (() => {
    if (!transactions.length) return [];

    const monthlyTotals: Record<string, { income: number; expenses: number }> = {};
    
    transactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (t.type === "income") {
        monthlyTotals[monthKey].income += t.amount;
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

  // Calculate category expenses
  const categoryData = (() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const categoryTotals: Record<string, number> = {};
    
    expenses.forEach((t) => {
      const absAmount = Math.abs(t.amount);
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + absAmount;
    });
    
    return Object.entries(categoryTotals).map(([category, value]) => ({
      name: categoryLabels[category as Category] || category,
      value: Math.round(value * 100) / 100,
      category: category as Category,
      color: categoryColors[category as Category] || "hsl(220, 10%, 55%)",
    }));
  })();

  // Calculate bank expenses
  const bankData = (() => {
    const expenses = transactions.filter((t) => t.type === "expense");
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

  // Calculate month summary
  const summary = (() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = Math.abs(
      transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
    );
    
    return {
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      balance: Math.round((income - expenses) * 100) / 100,
    };
  })();

  return {
    transactions,
    monthlyData,
    categoryData,
    bankData,
    summary,
    isLoading,
    error,
    deleteTransaction,
    hasData: transactions.length > 0,
  };
}
