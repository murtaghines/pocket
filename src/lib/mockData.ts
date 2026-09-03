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
  | 'to_investment'
  | 'from_investment'
  | 'to_joint_account'
  | 'from_joint_account';

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
  /** Bank + nickname display string, e.g. "Revolut · Personal". */
  account: string;
  bank: string;
  /** Real FK to accounts.id — prefer this over string-matching `account`/`bank`. */
  account_id?: string | null;
  runningBalance?: number | null;
  userCorrected?: boolean;
  fingerprint?: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  /** Money moved out via `to_investment` TRANSFERs this month — not spent, not idle either. */
  sentToInvest: number;
}
