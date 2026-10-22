import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Account } from "./useAccounts";

export interface AccountPeriod {
  firstDate: string | null;
  lastDate: string | null;
}

/** Date range covered by an account's data (transactions for bank accounts, investment
 *  movements — through the account's imports — for investment accounts). */
export function useAccountDetail(account: Account | null) {
  const { user } = useAuth();

  return useQuery<AccountPeriod>({
    queryKey: ["account-detail", account?.id],
    enabled: !!user?.id && !!account,
    staleTime: 30_000,
    queryFn: async () => {
      if (account!.account_role === "INVESTMENT") {
        const { data: imports } = await supabase.from("imports").select("id").eq("account_id", account!.id);
        const ids = (imports ?? []).map((i) => i.id);
        if (ids.length === 0) return { firstDate: null, lastDate: null };
        const edge = (ascending: boolean) =>
          supabase.from("investments").select("date").in("upload_id", ids).eq("is_hidden", false)
            .order("date", { ascending }).limit(1);
        const [first, last] = await Promise.all([edge(true), edge(false)]);
        return { firstDate: first.data?.[0]?.date ?? null, lastDate: last.data?.[0]?.date ?? null };
      }
      const edge = (ascending: boolean) =>
        supabase.from("transactions").select("date").eq("account_id", account!.id).eq("is_hidden", false)
          .order("date", { ascending }).limit(1);
      const [first, last] = await Promise.all([edge(true), edge(false)]);
      return { firstDate: first.data?.[0]?.date ?? null, lastDate: last.data?.[0]?.date ?? null };
    },
  });
}
