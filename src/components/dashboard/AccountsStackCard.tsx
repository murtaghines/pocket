import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "@/hooks/useAccounts";
import type { Transaction } from "@/lib/mockData";
import { Settings2, Landmark, PiggyBank, Users, CreditCard } from "lucide-react";
import { getAccountColorStyle, getDefaultAccountColor, getAccountDisplayName } from "@/lib/accountColors";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";

interface AccountsStackCardProps {
  transactions: Transaction[];
  monthKey: string | null;
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
  monthTxs: Transaction[];
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

export function AccountsStackCard({
  transactions,
  monthKey,
  convert,
  formatCurrency,
}: AccountsStackCardProps) {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { accounts, getCashAccounts } = useAccounts();
  const [detail, setDetail] = useState<AccountDisplay | null>(null);

  const cashAccounts = useMemo(() => getCashAccounts(), [accounts]);

  const accountsData = useMemo<AccountDisplay[]>(() => {
    if (!monthKey) return [];

    const mapped = cashAccounts.map((acc) => {
      // Prefer the real account_id FK; fall back to display-name matching only for
      // rows that somehow predate it, so an account never silently shows zero data.
      const monthTxs = transactions.filter((tx) => {
        const matches = tx.account_id ? tx.account_id === acc.id : tx.bank === getAccountDisplayName(acc);
        return matches && tx.date.startsWith(monthKey);
      });
      const withBalance = monthTxs.filter((tx) => tx.runningBalance != null);
      let balance = 0;
      let hasRunningBalance = false;

      if (withBalance.length > 0) {
        const sorted = [...withBalance].sort((a, b) => a.date < b.date ? -1 : 1);
        balance = sorted[sorted.length - 1].runningBalance!;
        hasRunningBalance = true;
      } else {
        balance = monthTxs.reduce((sum, tx) => {
          const signed = tx.type === "expense" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
          return sum + signed;
        }, 0);
      }

      return {
        id: acc.id,
        name: acc.name,
        institution: acc.institution,
        displayName: getAccountDisplayName(acc),
        currency: acc.currency_base,
        balance: convert(balance),
        hasRunningBalance,
        transactionCount: monthTxs.length,
        monthTxs,
        createdAt: acc.created_at,
        color: acc.color || "",
        isPrimary: !!acc.is_primary,
      };
    });

    const sorted = mapped.sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
    return sorted.map((acc, i) => ({
      ...acc,
      color: acc.color || getDefaultAccountColor(i),
    }));
  }, [cashAccounts, transactions, monthKey, convert]);

  const orderedAccounts = useMemo(() => {
    const primary = accountsData.find((a) => a.isPrimary);
    const rest = accountsData.filter((a) => !a.isPrimary);
    return primary ? [primary, ...rest] : rest;
  }, [accountsData]);

  return (
    <>
      <div
        className="bg-card rounded-2xl p-[20px_22px_18px] h-full"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[15px] font-semibold text-foreground">
              {t('charts.accounts', 'Accounts')}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
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
            {orderedAccounts.map((acc, idx) => {
              const v = getAccountColorStyle(acc.color);
              return (
                <div key={acc.id}>
                  {idx > 0 && <div className="h-px bg-border my-3" />}
                  <button
                    type="button"
                    onClick={() => setDetail(acc)}
                    className="flex items-center gap-3 w-full text-left group"
                  >
                    {/* Icon badge — light tint bg + full color icon */}
                    <div
                      className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0"
                      style={{
                        background: hexToRgba(acc.color, 0.12),
                        color: acc.color,
                      }}
                    >
                      <AccountTypeIcon institution={acc.institution} name={acc.name} />
                    </div>
                    {/* Bank · nickname */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-foreground truncate">
                        {acc.displayName}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground truncate">
                        {acc.transactionCount} {t('charts.txCount', 'tx')}
                      </p>
                    </div>
                    {/* Balance */}
                    <span className="text-[14px] font-semibold tabular-nums text-foreground shrink-0">
                      {formatCurrency(acc.balance)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account detail side sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col text-foreground">
          {detail && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-xl font-semibold text-foreground">{detail.displayName}</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {detail.hasRunningBalance ? t('charts.currentBalance', 'Balance') : t('charts.netFlow', 'Net flow')}
                  </p>
                  <p className="text-base sm:text-lg font-semibold tabular-nums truncate">{formatCurrency(detail.balance)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Transactions</p>
                  <p className="text-lg font-semibold tabular-nums">{detail.transactionCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Currency</p>
                  <p className="text-lg font-semibold">{detail.currency}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {detail.monthTxs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No transactions this month</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {[...detail.monthTxs]
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((tx) => (
                        <li key={tx.id} className="flex items-center justify-between py-2.5 gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate text-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{tx.date}</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums shrink-0 text-foreground">
                            {tx.type === "expense" ? "-" : tx.type === "income" ? "+" : ""}
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
