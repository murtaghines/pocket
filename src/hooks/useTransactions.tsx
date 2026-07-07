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
  
  // Fallback colors matching the CSS variables in index.css :root
  const fallbackColors: Record<string, string> = {
    'category-salary':           'hsl(47 100% 57%)',
    'category-refunds':          'hsl(200 85% 55%)',
    'category-transfers':        'hsl(216 100% 55%)',
    'category-other-income':     'hsl(220 10% 55%)',
    'category-investment':       'hsl(216 75% 42%)',
    'category-freelance':        'hsl(260 60% 62%)',
    'category-rents':            'hsl(35 90% 60%)',
    'category-housing':          'hsl(14 80% 58%)',
    'category-groceries':        'hsl(145 55% 42%)',
    'category-restaurants':      'hsl(22 95% 58%)',
    'category-transport':        'hsl(210 80% 55%)',
    'category-health':           'hsl(355 70% 55%)',
    'category-entertainment':    'hsl(280 65% 60%)',
    'category-shopping':         'hsl(240 65% 62%)',
    'category-education':        'hsl(190 80% 42%)',
    'category-subscriptions':    'hsl(250 55% 55%)',
    'category-travel':           'hsl(47 100% 57%)',
    'category-sports':           'hsl(175 70% 38%)',
    'category-other-expense':    'hsl(220 10% 55%)',
    'category-pets':             'hsl(30 85% 55%)',
    'category-own-transfer':     'hsl(220 12% 50%)',
    'category-to-investment':    'hsl(216 75% 42%)',
    'category-to-joint-account': 'hsl(200 85% 50%)',
  };
  
  return fallbackColors[varName] || "hsl(220, 10%, 55%)";
}

type AppDomain = Database["public"]["Enums"]["app_domain"];
type MovementType = Database["public"]["Enums"]["movement_type"];

// Canonical transactions shape after the Fase 4 schema cleanup. Legacy columns
// (type, tx_type, bank, amount_base, transaction_hash, upload_id, linked_transaction_id,
// original_text) were dropped from the DB — `movement` is the single source of truth for
// income/expense/transfer and `account_id` for the account. See docs/epics/uploads.md.
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
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["transactions", user?.id, domain, periodId],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch accounts for this user to map account_id -> name
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("user_id", user.id);
      
      const accountMap: Record<string, string> = {};
      (accountsData || []).forEach(a => { accountMap[a.id] = a.name; });

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
        let categoryOverride: string | null = null;
        if (t.amount > 0 && movement === 'EXPENSE') {
          movement = 'INCOME';
          // Original category was an expense category; reset to a sensible income default
          categoryOverride = 'other_income';
        } else if (t.amount < 0 && movement === 'INCOME') {
          movement = 'EXPENSE';
          // Original category was an income category; reset to a sensible expense default
          categoryOverride = 'other_expense';
        }

        // Derive the app-level `type` (income/expense/transfer) from `movement`, the DB's
        // single source of truth. The legacy `type` DB column was dropped in Fase 4.
        const movementToType: Record<string, "income" | "expense" | "transfer"> = {
          INCOME: "income",
          EXPENSE: "expense",
          TRANSFER: "transfer",
        };

        const type = movement ? movementToType[movement] : "expense";

        const finalCategory = categoryOverride || t.category;
        const accountName = t.account_id ? accountMap[t.account_id] || "Unknown" : "Unknown";

        return {
          id: t.id,
          date: t.date,
          description: cleanDesc,
          amount: t.amount,
          currency: t.currency || "EUR",
          type,
          movement,
          category: finalCategory as Category,
          categorySlug: finalCategory,
          account: accountName,
          bank: accountName,
          runningBalance: t.running_balance,
          userCorrected: t.user_corrected ?? false,
        };
      });
    },
    enabled: !!user,
  });

  // Compute opening balance per month from running_balance data.
  // For each account in each month, reverse-engineer the opening balance from the
  // first transaction's running_balance minus its amount. Sum across all accounts
  // to get total wallet opening balance.
  const openingBalanceByMonth: Record<string, number> = (() => {
    if (!transactions.length) return {};

    // Group by month -> account -> transactions
    const byMonthAccount: Record<string, Record<string, Transaction[]>> = {};
    for (const tx of transactions) {
      const monthKey = tx.date.substring(0, 7);
      const accountKey = tx.account_id || 'unknown';
      if (!byMonthAccount[monthKey]) byMonthAccount[monthKey] = {};
      if (!byMonthAccount[monthKey][accountKey]) byMonthAccount[monthKey][accountKey] = [];
      byMonthAccount[monthKey][accountKey].push(tx);
    }
    
    const result: Record<string, number> = {};

    for (const [monthKey, accounts] of Object.entries(byMonthAccount)) {
      let totalOpening = 0;
      let hasAnyBalance = false;

      for (const [, txs] of Object.entries(accounts)) {
        // Get transactions with running_balance on the earliest date
        const withBalance = txs.filter(t => t.running_balance != null);
        if (!withBalance.length) continue;

        // Find the earliest date for this account in this month
        const earliestDate = withBalance.reduce((min, t) => t.date < min ? t.date : min, withBalance[0].date);
        const txsOnEarliestDate = withBalance.filter(t => t.date === earliestDate);
        
        // Build set of all running_balance values (as integers to avoid float issues)
        const balanceSet = new Set(txsOnEarliestDate.map(t => Math.round(t.running_balance! * 100)));

        // Find the first transaction: its (running_balance - amount) is NOT in the balance set
        const firstTx = txsOnEarliestDate.find(t => {
          const candidateOpening = Math.round((t.running_balance! - t.amount) * 100);
          return !balanceSet.has(candidateOpening);
        });

        if (firstTx) {
          totalOpening += firstTx.running_balance! - firstTx.amount;
        } else {
          // Fallback: pick the transaction with max (running_balance - amount)
          const fallback = txsOnEarliestDate.reduce((best, t) => {
            const opening = t.running_balance! - t.amount;
            return opening > (best.running_balance! - best.amount) ? t : best;
          });
          totalOpening += fallback.running_balance! - fallback.amount;
        }
        hasAnyBalance = true;
      }
      
      if (hasAnyBalance) {
        result[monthKey] = Math.round(totalOpening * 100) / 100;
      }
    }
    
    return result;
  })();

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

  // Filter out transfers for financial calculations (movement is the source of truth)
  const financialTransactions = transactions.filter((t) => t.movement !== "TRANSFER");
  const transfers = transactions.filter((t) => t.movement === "TRANSFER");
  const investmentMovements = transactions.filter(
    (t) => t.categorySlug === "to_investment"
  );

  // Calculate monthly data from transactions (excluding transfers).
  // `sentToInvest` is tracked separately from `financialTransactions`, computed from the
  // to_investment TRANSFERs directly — it's neither income nor expense (the money is still
  // yours, just moved), but it's not idle/leftover cash either, so it needs its own bucket
  // to answer "how much of what I didn't spend did I choose to invest, vs just sitting idle."
  const monthlyData: MonthlyData[] = (() => {
    if (!financialTransactions.length && !investmentMovements.length) return [];

    const monthKeyOf = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    };

    const monthlyTotals: Record<string, { income: number; expenses: number; sentToInvest: number }> = {};
    const ensure = (key: string) => {
      if (!monthlyTotals[key]) monthlyTotals[key] = { income: 0, expenses: 0, sentToInvest: 0 };
      return monthlyTotals[key];
    };

    financialTransactions.forEach((t) => {
      const bucket = ensure(monthKeyOf(t.date));
      if (t.movement === "INCOME") {
        bucket.income += Math.abs(t.amount);
      } else {
        bucket.expenses += Math.abs(t.amount);
      }
    });

    investmentMovements.forEach((t) => {
      ensure(monthKeyOf(t.date)).sentToInvest += Math.abs(t.amount);
    });

    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        return {
          month: key,
          income: Math.round(data.income * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100,
          balance: Math.round((data.income - data.expenses) * 100) / 100,
          sentToInvest: Math.round(data.sentToInvest * 100) / 100,
        };
      });
  })();

  // Determine the latest month key for filtering charts/summary
  const latestMonthKey = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].month : null;

  // Filter financial transactions to only the latest month
  const currentMonthTransactions = latestMonthKey
    ? financialTransactions.filter((t) => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return monthKey === latestMonthKey;
      })
    : financialTransactions;

  // Calculate category expenses (excluding transfers) - current month only
  const categoryData = (() => {
    const expenses = currentMonthTransactions.filter((t) => t.movement === "EXPENSE");
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

  // Calculate category income (excluding transfers) - current month only
  const incomeCategoryData = (() => {
    const incomes = currentMonthTransactions.filter((t) => t.movement === "INCOME");
    const categoryTotals: Record<string, number> = {};
    
    incomes.forEach((t) => {
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

  // Calculate bank expenses (excluding transfers) - current month only
  const bankData = (() => {
    const expenses = currentMonthTransactions.filter((t) => t.movement === "EXPENSE");
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

  // Current-month slice of the to_investment transfers, mirroring how
  // currentMonthTransactions filters financialTransactions above.
  const currentMonthInvestmentMovements = latestMonthKey
    ? investmentMovements.filter((t) => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return monthKey === latestMonthKey;
      })
    : investmentMovements;

  // Calculate month summary (excluding transfers) - current month only
  const summary = (() => {
    const income = currentMonthTransactions
      .filter((t) => t.movement === "INCOME")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const expenses = currentMonthTransactions
      .filter((t) => t.movement === "EXPENSE")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const sentToInvest = currentMonthInvestmentMovements
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      balance: Math.round((income - expenses) * 100) / 100,
      sentToInvest: Math.round(sentToInvest * 100) / 100,
    };
  })();

  return {
    transactions,
    transfers,
    investmentMovements,
    monthlyData,
    categoryData,
    incomeCategoryData,
    bankData,
    summary,
    openingBalanceByMonth,
    isLoading,
    error,
    deleteTransaction,
    hasData: transactions.length > 0,
    transfersCount: transfers.length,
    investmentMovementsCount: investmentMovements.length,
  };
}
