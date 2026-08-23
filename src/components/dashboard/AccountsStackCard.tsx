import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Settings2, Landmark, PiggyBank, Users, CreditCard, Loader2 } from "lucide-react";
import { getAccountColorStyle, getDefaultAccountColor, getAccountDisplayName } from "@/lib/accountColors";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";

interface AccountsStackCardProps {
  startDate?: string;
  endDate?: string;
  convert: (amount: number) => number;
  formatCurrency: (amount: number) => string;
}

type AccountDisplay = {
  id: string;
  name: string;
  institution: string;
  displayName: string;
  currency: string;
  balance: number;
  hasRunningBalance: boolean;
  transactionCount: number;
  createdAt: string;
  color: string;
  isPrimary: boolean;
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function AccountTypeIcon({ institution, name }: { institution: string; name: string }) {
  const lower = `${institution} ${name}`.toLowerCase();
  if (lower.includes('sav') || lower.includes('ahorro') || lower.includes('piggy'))
    return <PiggyBank className="w-[19px] h-[19px]" strokeWidth={2} />;
  if (lower.includes('joint') || lower.includes('conjunt') || lower.includes('shared') || lower.includes('compartid'))
    return <Users className="w-[19px] h-[19px]" strokeWidth={2} />;
  if (lower.includes('credit') || lower.includes('card') || lower.includes('tarjeta'))
    return <CreditCard className="w-[19px] h-[19px]" strokeWidth={2} />;
  return <Landmark className="w-[19px] h-[19px]" strokeWidth={2} />;
}

interface DetailTx {
  id: string;
  date: string;
  description: string;
  amount: number;
  movement: string | null;
}

export function AccountsStackCard({
  startDate,
  endDate,
  convert,
  formatCurrency,
}: AccountsStackCardProps) {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts, getCashAccounts } = useAccounts();
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);

  const cashAccounts = useMemo(() => getCashAccounts(), [accounts]);

  const { data: summaryRows = [] } = useQuery({
    queryKey: ["account-period-summary", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user?.id || !startDate || !endDate) return [];
      const { data, error } = await supabase.rpc("get_account_period_summary", {
        p_user_id: user.id,
        p_start: startDate,
        p_end: endDate,
      });
      if (error) throw error;
      return (data ?? []).map((r: { account_id: string; latest_balance: number; has_running_balance: boolean; tx_count: number }) => ({
        account_id: r.account_id,
        latest_balance: Number(r.latest_balance),
        has_running_balance: r.has_running_balance,
        tx_count: Number(r.tx_count),
      }));
    },
    enabled: !!user?.id && !!startDate && !!endDate,
  });

  const summaryMap = useMemo(() => {
    const m = new Map<string, { latest_balance: number; has_running_balance: boolean; tx_count: number }>();
    for (const r of summaryRows) m.set(r.account_id, r);
    return m;
  }, [summaryRows]);

  const accountsData = useMemo<AccountDisplay[]>(() => {
    if (!startDate || !endDate) return [];

    const mapped = cashAccounts.map((acc, i) => {
      const summary = summaryMap.get(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        institution: acc.institution,
        displayName: getAccountDisplayName(acc),
        currency: acc.currency_base,
        balance: convert(summary?.latest_balance ?? 0),
        hasRunningBalance: summary?.has_running_balance ?? false,
        transactionCount: summary?.tx_count ?? 0,
        createdAt: acc.created_at,
        color: acc.color || getDefaultAccountColor(i),
        isPrimary: !!acc.is_primary,
      };
    });

    return mapped.sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
  }, [cashAccounts, summaryMap, startDate, endDate, convert]);

  const orderedAccounts = useMemo(() => {
    const primary = accountsData.find((a) => a.isPrimary);
    const rest = accountsData.filter((a) => !a.isPrimary);
    return primary ? [primary, ...rest] : rest;
  }, [accountsData]);

  const detailAccount = useMemo(
    () => accountsData.find((a) => a.id === detailAccountId) ?? null,
    [accountsData, detailAccountId],
  );

  const { data: detailTxs = [], isLoading: detailLoading } = useQuery({
    queryKey: ["account-detail-txs", detailAccountId, startDate, endDate],
    queryFn: async () => {
      if (!user?.id || !detailAccountId || !startDate || !endDate) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, description, amount, movement")
        .eq("user_id", user.id)
        .eq("account_id", detailAccountId)
        .eq("is_hidden", false)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DetailTx[];
    },
    enabled: !!user?.id && !!detailAccountId && !!startDate && !!endDate,
  });

  return (
    <>
      <div
        className="bg-card rounded-xl p-[20px_22px_18px] h-full shadow-section"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[15px] font-heading font-semibold text-foreground">
              {t('charts.accounts', 'Accounts')}
            </p>
            <p className="text-[12.5px] text-[#9AA1AC] mt-0.5">
              {t('charts.accountsSubtitle', 'Month-end balance')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/account?tab=accounts")}
            aria-label={t("charts.manageAccounts", "Manage accounts")}
            title={t("charts.manageAccounts", "Manage accounts")}
            className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <Settings2 className="w-[16px] h-[16px]" strokeWidth={2} />
          </button>
        </div>

        {orderedAccounts.length === 0 ? (
          <EmptyState height="h-[160px]" />
        ) : (
          <div className="flex flex-col">
            {orderedAccounts.map((acc, idx) => (
              <div key={acc.id}>
                {idx > 0 && <div className="h-px bg-[#F1F2F4]" />}
                <button
                  type="button"
                  onClick={() => setDetailAccountId(acc.id)}
                  className="flex items-center gap-3 w-full text-left group py-[11px]"
                >
                  <div
                    className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0"
                    style={{
                      background: hexToRgba(acc.color, 0.12),
                      color: acc.color,
                    }}
                  >
                    <AccountTypeIcon institution={acc.institution} name={acc.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium text-foreground truncate">
                      {acc.displayName}
                    </p>
                    <p className="text-[12px] text-[#9AA1AC] truncate">
                      {acc.transactionCount} {t('charts.txCount', 'tx')}
                    </p>
                  </div>
                  <span className="text-[14px] font-semibold tabular-nums text-foreground shrink-0">
                    {formatCurrency(acc.balance)}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account detail side sheet */}
      <Sheet open={!!detailAccountId} onOpenChange={(o) => !o && setDetailAccountId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col text-foreground">
          {detailAccount && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-xl font-semibold text-foreground">{detailAccount.displayName}</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {detailAccount.hasRunningBalance ? t('charts.currentBalance', 'Balance') : t('charts.netFlow', 'Net flow')}
                  </p>
                  <p className="text-sm md:text-lg font-semibold tabular-nums truncate">{formatCurrency(detailAccount.balance)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Transactions</p>
                  <p className="text-lg font-semibold tabular-nums">{detailAccount.transactionCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Currency</p>
                  <p className="text-lg font-semibold">{detailAccount.currency}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : detailTxs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("transactions.noTransactions", "No transactions this period")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {detailTxs.map((tx) => (
                      <li key={tx.id} className="flex items-center justify-between py-2.5 gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-foreground">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{tx.date}</p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums shrink-0 text-foreground">
                          {tx.movement === "EXPENSE" ? "-" : tx.movement === "INCOME" ? "+" : ""}
                          {formatCurrency(convert(Math.abs(tx.amount)))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
