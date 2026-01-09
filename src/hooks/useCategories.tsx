import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type MovementType = Database["public"]["Enums"]["movement_type"];

export interface GroupedCategories {
  income: Category[];
  expense: Category[];
  transfer: Category[];
  all: Category[];
}

export function useCategories(domain: "CASHFLOW" | "INVESTING" = "CASHFLOW") {
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["categories", domain],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("domain", domain)
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const grouped: GroupedCategories = {
    income: [],
    expense: [],
    transfer: [],
    all: categories || [],
  };

  if (categories) {
    for (const cat of categories) {
      if (cat.movement_type === "INCOME") {
        grouped.income.push(cat);
      } else if (cat.movement_type === "EXPENSE") {
        grouped.expense.push(cat);
      } else if (cat.movement_type === "TRANSFER") {
        grouped.transfer.push(cat);
      }
    }
  }

  // Helper to get categories by transaction type (for legacy "income"/"expense"/"transfer" strings)
  const getCategoriesForType = (type: string): Category[] => {
    switch (type.toLowerCase()) {
      case "income":
        return grouped.income;
      case "expense":
        return grouped.expense;
      case "transfer":
        return grouped.transfer;
      default:
        return grouped.all;
    }
  };

  return {
    categories: grouped.all,
    incomeCategories: grouped.income,
    expenseCategories: grouped.expense,
    transferCategories: grouped.transfer,
    getCategoriesForType,
    isLoading,
    error,
  };
}
