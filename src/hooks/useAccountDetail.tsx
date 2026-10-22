import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Account } from "./useAccounts";

export interface AccountRecentRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  kind: string | null;
  category: string | null;
}

export interface AccountDetail {
  count: number;
  uncategorized: number;
  firstDate: string | null;
  lastDate: string | null;
  balance: number | null;
  recent: AccountRecentRow[];
}

const RECENT_LIMIT = 8;

const EMPTY: AccountDetail = {
  count: 0,
  uncategorized: 0,
  firstDate: null,
  lastDate: null,
  balance: null,
  recent: [],
};

async function loadCashAccount(account: Account, userId: string): Promise<AccountDetail> {
  const base = () => supabase.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", account.id).eq("is_hidden", false);
  const edge = (ascending: boolean) =>
    supabase.from("transactions").select("date").eq("account_id", account.id).eq("is_hidden", false)
      .order("date", { ascending }).limit(1);

  const today = new Date().toISOString().slice(0, 10);
  const [countRes, uncatRes, firstRes, lastRes, recentRes, balanceRes] = await Promise.all([
    base(),
    base().eq("category", "uncategorized"),
    edge(true),
    edge(false),
    supabase.from("transactions").select("id, date, description, amount, movement, category")
      .eq("account_id", account.id).eq("is_hidden", false)
      .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(RECENT_LIMIT),
    supabase.rpc("get_account_period_summary", {
      p_user_id: userId,
      p_start: "1900-01-01",
      p_end: today,
      p_domain: "CASHFLOW",
    }),
  ]);

  const fromRpc = (balanceRes.data ?? []).find((r: { account_id: string }) => r.account_id === account.id);
  const balance = fromRpc
    ? Number(fromRpc.latest_balance)
    : (Number(account.initial_balance) * Number(account.split_percentage)) / 100;

  return {
    count: countRes.count ?? 0,
    uncategorized: uncatRes.count ?? 0,
    firstDate: firstRes.data?.[0]?.date ?? null,
    lastDate: lastRes.data?.[0]?.date ?? null,
    balance,
    recent: (recentRes.data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amount: Number(r.amount),
      kind: r.movement,
      category: r.category,
    })),
  };
}

async function loadInvestmentAccount(account: Account): Promise<AccountDetail> {
  const importsRes = await supabase.from("imports").select("id").eq("account_id", account.id);
  const ids = (importsRes.data ?? []).map((i) => i.id);
  if (ids.length === 0) return EMPTY;

  const edge = (ascending: boolean) =>
    supabase.from("investments").select("date").in("upload_id", ids).eq("is_hidden", false)
      .order("date", { ascending }).limit(1);

  const [countRes, firstRes, lastRes, recentRes] = await Promise.all([
    supabase.from("investments").select("id", { count: "exact", head: true }).in("upload_id", ids).eq("is_hidden", false),
    edge(true),
    edge(false),
    supabase.from("investments").select("id, date, description, amount, type, asset_type")
      .in("upload_id", ids).eq("is_hidden", false)
      .order("date", { ascending: false }).limit(RECENT_LIMIT),
  ]);

  return {
    count: countRes.count ?? 0,
    uncategorized: 0,
    firstDate: firstRes.data?.[0]?.date ?? null,
    lastDate: lastRes.data?.[0]?.date ?? null,
    balance: null,
    recent: (recentRes.data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amount: Number(r.amount),
      kind: r.type,
      category: r.asset_type,
    })),
  };
}

export function useAccountDetail(account: Account | null) {
  const { user } = useAuth();

  return useQuery<AccountDetail>({
    queryKey: ["account-detail", account?.id, account?.initial_balance, account?.split_percentage],
    enabled: !!user?.id && !!account,
    staleTime: 30_000,
    queryFn: () =>
      account!.account_role === "INVESTMENT"
        ? loadInvestmentAccount(account!)
        : loadCashAccount(account!, user!.id),
  });
}
