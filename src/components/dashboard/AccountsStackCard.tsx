import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccounts } from "@/hooks/useAccounts";
import type { Transaction } from "@/lib/mockData";
import { Wallet } from "lucide-react";

interface AccountsStackCardProps {
  transactions: Transaction[];
  monthKey: string | null;
  convert: (amount: number) => number;
  formatCurrency: (amount: number) => string;
}

type AccountDisplay = {
  id: string;
  name: string;
  institution: string | null;
  currency: string;
  balance: number;
  hasRunningBalance: boolean;
};

export function AccountsStackCard({
  transactions,
  monthKey,
  convert,
  formatCurrency,
}: AccountsStackCardProps) {
  const { t } = useTranslation("dashboard");
  const { accounts, getCashAccounts } = useAccounts();

  const cashAccounts = useMemo(() => getCashAccounts(), [accounts]);

  const accountsData = useMemo<AccountDisplay[]>(() => {
    if (!monthKey || cashAccounts.length === 0) return [];

    return cashAccounts.map((acc) => {
      // Transactions of this account in the target month
      const monthTxs = transactions.filter(
        (tx) => tx.bank === acc.name && tx.date.startsWith(monthKey)
      );

      // Try running_balance approach: use the latest tx (by date) of the month
      const withBalance = monthTxs.filter((tx) => tx.runningBalance != null);
      let balance = 0;
      let hasRunningBalance = false;

      if (withBalance.length > 0) {
        // Pick latest by date, then by created order (last in array)
        const sorted = [...withBalance].sort((a, b) =>
          a.date < b.date ? -1 : a.date > b.date ? 1 : 0
        );
        const latest = sorted[sorted.length - 1];
        balance = latest.runningBalance!;
        hasRunningBalance = true;
      } else {
        // Fallback: net flow of the month
        balance = monthTxs.reduce((sum, tx) => {
          const signed =
            tx.type === "expense" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
          return sum + signed;
        }, 0);
      }

      return {
        id: acc.id,
        name: acc.name,
        institution: acc.institution,
        currency: acc.currency_base,
        balance: convert(balance),
        hasRunningBalance,
      };
    });
  }, [cashAccounts, transactions, monthKey, convert]);

  const variants = [
    {
      // Brand blue
      bg: "bg-[#1b76ff]",
      text: "text-white",
      sub: "text-white/70",
      circle: "bg-white/10",
    },
    {
      // Brand yellow
      bg: "bg-[#ffd027]",
      text: "text-[#1a1a1a]",
      sub: "text-[#1a1a1a]/60",
      circle: "bg-black/5",
    },
    {
      // White with blue border
      bg: "bg-card border-2 border-[#1b76ff]/20",
      text: "text-foreground",
      sub: "text-muted-foreground",
      circle: "bg-[#1b76ff]/5",
    },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {t("charts.accounts", { defaultValue: "Accounts" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {accountsData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            <Wallet className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">
              {t("charts.noAccounts", { defaultValue: "No accounts yet" })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
            {accountsData.map((acc, idx) => {
              const v = variants[idx % variants.length];
              return (
                <div
                  key={acc.id}
                  className={`relative overflow-hidden rounded-2xl p-4 ${v.bg} transition-transform hover:scale-[1.02]`}
                >
                  {/* Decorative circle */}
                  <div
                    className={`absolute -right-6 -top-6 w-20 h-20 rounded-full ${v.circle}`}
                    aria-hidden
                  />
                  <div
                    className={`absolute -right-2 top-8 w-10 h-10 rounded-full ${v.circle}`}
                    aria-hidden
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${v.text}`}>
                          {acc.name}
                        </p>
                        {acc.institution && (
                          <p className={`text-xs truncate ${v.sub}`}>
                            {acc.institution}
                          </p>
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-2xl font-bold tabular-nums ${v.text}`}
                    >
                      {formatCurrency(acc.balance)}
                    </p>

                    <div
                      className={`mt-1 text-[11px] uppercase tracking-wider ${v.sub}`}
                    >
                      {acc.currency} ·{" "}
                      {acc.hasRunningBalance
                        ? t("charts.currentBalance", {
                            defaultValue: "Current balance",
                          })
                        : t("charts.netFlow", { defaultValue: "Net flow" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
