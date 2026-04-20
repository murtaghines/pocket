import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccounts } from "@/hooks/useAccounts";
import type { Transaction } from "@/lib/mockData";
import { Wallet, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  transactionCount: number;
  monthTxs: Transaction[];
};

const VARIANTS = [
  // Brand blue
  {
    bg: "bg-[#1b76ff]",
    text: "text-white",
    sub: "text-white/70",
    circle: "bg-white/10",
  },
  // Brand yellow
  {
    bg: "bg-[#ffd027]",
    text: "text-[#1a1a1a]",
    sub: "text-[#1a1a1a]/60",
    circle: "bg-black/5",
  },
  // Dark
  {
    bg: "bg-[#1a1a1a]",
    text: "text-white",
    sub: "text-white/60",
    circle: "bg-white/5",
  },
  // White with blue border
  {
    bg: "bg-white border-2 border-[#1b76ff]/20",
    text: "text-foreground",
    sub: "text-muted-foreground",
    circle: "bg-[#1b76ff]/5",
  },
];

export function AccountsStackCard({
  transactions,
  monthKey,
  convert,
  formatCurrency,
}: AccountsStackCardProps) {
  const { t } = useTranslation("dashboard");
  const { accounts, getCashAccounts } = useAccounts();
  const [selected, setSelected] = useState<AccountDisplay | null>(null);

  const cashAccounts = useMemo(() => getCashAccounts(), [accounts]);

  const accountsData = useMemo<AccountDisplay[]>(() => {
    if (!monthKey) return [];

    return cashAccounts.map((acc) => {
      const monthTxs = transactions.filter(
        (tx) => tx.bank === acc.name && tx.date.startsWith(monthKey)
      );

      const withBalance = monthTxs.filter((tx) => tx.runningBalance != null);
      let balance = 0;
      let hasRunningBalance = false;

      if (withBalance.length > 0) {
        const sorted = [...withBalance].sort((a, b) =>
          a.date < b.date ? -1 : a.date > b.date ? 1 : 0
        );
        balance = sorted[sorted.length - 1].runningBalance!;
        hasRunningBalance = true;
      } else {
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
        transactionCount: monthTxs.length,
        monthTxs,
      };
    });
  }, [cashAccounts, transactions, monthKey, convert]);

  return (
    <>
      <div className="h-full flex flex-col">
        {accountsData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            <Wallet className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">
              {t("charts.noAccounts", { defaultValue: "No accounts yet" })}
            </p>
          </div>
        ) : (
          <div className="relative">
            {accountsData.map((acc, idx) => {
              const v = VARIANTS[idx % VARIANTS.length];
              const marginTop = idx === 0 ? 0 : -56;
              return (
                <button
                  type="button"
                  key={acc.id}
                  onClick={() => setSelected(acc)}
                  className={`relative block w-full text-left rounded-2xl p-5 ${v.bg} shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#1b76ff]/40`}
                  style={{
                    marginTop,
                    zIndex: idx + 1,
                    minHeight: 160,
                  }}
                >
                  <div
                    className={`absolute -right-8 -top-8 w-24 h-24 rounded-full ${v.circle}`}
                    aria-hidden
                  />
                  <div
                    className={`absolute right-2 top-6 w-12 h-12 rounded-full ${v.circle}`}
                    aria-hidden
                  />

                  <div className="relative flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className={`text-sm font-semibold truncate ${v.text}`}>
                          {acc.name}
                        </p>
                        {acc.institution && (
                          <p className={`text-xs truncate ${v.sub}`}>
                            {acc.institution}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className={`text-2xl font-bold tabular-nums leading-tight ${v.text}`}>
                      {formatCurrency(acc.balance)}
                    </p>

                    <div
                      className={`mt-auto pt-3 flex items-center justify-between text-[11px] uppercase tracking-wider ${v.sub}`}
                    >
                      <span>
                        {acc.transactionCount}{" "}
                        {t("charts.txCount", { defaultValue: "tx" })}
                      </span>
                      <span>
                        {acc.currency} ·{" "}
                        {acc.hasRunningBalance
                          ? t("charts.currentBalance", {
                              defaultValue: "Current balance",
                            })
                          : t("charts.netFlow", {
                              defaultValue: "Net flow",
                            })}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {selected.name}
                </DialogTitle>
                {selected.institution && (
                  <p className="text-sm text-muted-foreground">
                    {selected.institution}
                  </p>
                )}
              </DialogHeader>

              <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {selected.hasRunningBalance
                      ? t("charts.currentBalance", {
                          defaultValue: "Current balance",
                        })
                      : t("charts.netFlow", { defaultValue: "Net flow" })}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {formatCurrency(selected.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {t("charts.txCount", { defaultValue: "Transactions" })}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {selected.transactionCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {t("charts.currency", { defaultValue: "Currency" })}
                  </p>
                  <p className="text-xl font-bold">{selected.currency}</p>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto -mx-1 px-1">
                {selected.monthTxs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("charts.noTransactions", {
                      defaultValue: "No transactions this month",
                    })}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {[...selected.monthTxs]
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((tx) => (
                        <li
                          key={tx.id}
                          className="flex items-center justify-between py-2.5 gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {tx.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.date}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-semibold tabular-nums shrink-0 ${
                              tx.type === "expense"
                                ? "text-destructive"
                                : tx.type === "income"
                                ? "text-success"
                                : "text-muted-foreground"
                            }`}
                          >
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
        </DialogContent>
      </Dialog>
    </>
  );
}
