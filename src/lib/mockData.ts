import type { Database } from "@/integrations/supabase/types";

type MovementType = Database["public"]["Enums"]["movement_type"];

export type Category =
  | 'food'
  | 'transport'
  | 'housing'
  | 'subscriptions'
  | 'leisure'
  | 'health'
  | 'education'
  | 'travel'
  | 'other'
  | 'income'
  | 'transfer'
  | 'investment'
  // Income categories
  | 'salary'
  | 'refunds'
  | 'transfers'
  | 'other_income'
  | 'freelance'
  | 'rents'
  // Expense categories
  | 'groceries'
  | 'restaurants'
  | 'entertainment'
  | 'shopping'
  | 'sports'
  | 'other_expense'
  | 'pets'
  // Transfer categories
  | 'own_transfer'
  | 'to_investment';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  movement?: MovementType | null;
  category: Category;
  categorySlug?: string;
  account: string;
  bank: string;
  runningBalance?: number | null;
  userCorrected?: boolean;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}
