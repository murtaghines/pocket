import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RecentFile {
  id: string;
  file_name: string;
  account_id: string | null;
  month_key: string | null;
  status: string;
  uploaded_at: string;
  file_storage_url: string | null;
}

export interface AccountOverviewStats {
  totalFiles: number;
  recentFiles: RecentFile[];
  totalTransactions: number;
  categorizedPercent: number;
  minMonth: string | null;
  maxMonth: string | null;
  monthCount: number;
  accountFileMap: Record<string, number>;
}

export function useAccountOverviewStats() {
  const { user } = useAuth();

  return useQuery<AccountOverviewStats | null>({
    queryKey: ["account-overview-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [importsRes, totalTxRes, uncatTxRes] = await Promise.all([
        supabase
          .from("imports")
          .select("id, account_id, file_name, status, uploaded_at, file_storage_url, periods(month_key)")
          .eq("user_id", user.id)
          .eq("domain", "CASHFLOW")
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("category", "uncategorized"),
      ]);

      const imports = importsRes.data || [];

      const monthKeys = imports
        .map((i) => (i.periods as { month_key?: string } | null)?.month_key)
        .filter((m): m is string => !!m)
        .sort();

      const uniqueMonths = [...new Set(monthKeys)];

      const accountFileMap: Record<string, number> = {};
      for (const imp of imports) {
        if (imp.account_id) {
          accountFileMap[imp.account_id] = (accountFileMap[imp.account_id] || 0) + 1;
        }
      }

      const totalTxs = totalTxRes.count || 0;
      const uncatTxs = uncatTxRes.count || 0;

      return {
        totalFiles: imports.length,
        recentFiles: imports.slice(0, 5).map((i) => ({
          id: i.id,
          file_name: i.file_name,
          account_id: i.account_id,
          month_key: (i.periods as { month_key?: string } | null)?.month_key || null,
          status: i.status,
          uploaded_at: i.uploaded_at,
          file_storage_url: i.file_storage_url,
        })),
        totalTransactions: totalTxs,
        categorizedPercent: totalTxs > 0
          ? Math.round(((totalTxs - uncatTxs) / totalTxs) * 100)
          : 0,
        minMonth: uniqueMonths[0] || null,
        maxMonth: uniqueMonths[uniqueMonths.length - 1] || null,
        monthCount: uniqueMonths.length,
        accountFileMap,
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
