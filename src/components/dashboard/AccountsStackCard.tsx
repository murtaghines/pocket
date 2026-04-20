import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "@/hooks/useAccounts";
import type { Transaction } from "@/lib/mockData";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  { bg: "bg-[#1b76ff]", text: "text-white", sub: "text-white/70", circle: "bg-white/10" },
  { bg: "bg-[#ffd027]", text: "text-[#1a1a1a]", sub: "text-[#1a1a1a]/60", circle: "bg-black/5" },
  { bg: "bg-[#1a1a1a]", text: "text-white", sub: "text-white/60", circle: "bg-white/5" },
  { bg: "bg-white border-2 border-[#1b76ff]/20", text: "text-foreground", sub: "text-muted-foreground", circle: "bg-[#1b76ff]/5" },
];

export function AccountsStackCard({
  transactions,
  monthKey,
  convert,
  formatCurrency,
}: AccountsStackCardProps) {
  const { t } = useTranslation("dashboard");
  const { accounts, getCashAccounts, createAccount, isCreating } = useAccounts();
  const [selected, setSelected] = useState<AccountDisplay | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

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

  const TOTAL_SLOTS = 4;
  // We always reserve the last slot for the "+" add button.
  const placeholdersNeeded = Math.max(0, TOTAL_SLOTS - accountsData.length - 1);
  const totalCards = accountsData.length + placeholdersNeeded + 1; // +1 for the add button

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createAccount({ name: trimmed, account_role: "CASH", domain_default: "CASHFLOW" });
    setNewName("");
    setAddOpen(false);
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="relative">
          {/* Real account cards */}
          {accountsData.map((acc, idx) => {
            const v = VARIANTS[idx % VARIANTS.length];
            const marginTop = idx === 0 ? 0 : -120;
            return (
              <button
                type="button"
                key={acc.id}
                onClick={() => setSelected(acc)}
                className={`relative block w-full text-left rounded-2xl p-5 ${v.bg} shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#1b76ff]/40`}
                style={{ marginTop, zIndex: totalCards - idx, minHeight: 160 }}
              >
                <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full ${v.circle}`} aria-hidden />
                <div className={`absolute right-2 top-6 w-12 h-12 rounded-full ${v.circle}`} aria-hidden />

                <div className="relative flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className={`text-sm font-semibold truncate ${v.text}`}>{acc.name}</p>
                      {acc.institution && (
                        <p className={`text-xs truncate ${v.sub}`}>{acc.institution}</p>
                      )}
                    </div>
                  </div>

                  <p className={`text-2xl font-bold tabular-nums leading-tight ${v.text}`}>
                    {formatCurrency(acc.balance)}
                  </p>

                  <div className={`mt-auto pt-3 flex items-center justify-between text-[11px] uppercase tracking-wider ${v.sub}`}>
                    <span>
                      {acc.transactionCount} {t("charts.txCount", { defaultValue: "tx" })}
                    </span>
                    <span>
                      {acc.currency} ·{" "}
                      {acc.hasRunningBalance
                        ? t("charts.currentBalance", { defaultValue: "Current balance" })
                        : t("charts.netFlow", { defaultValue: "Net flow" })}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Empty placeholder slots (solid, no transparency) */}
          {Array.from({ length: placeholdersNeeded }).map((_, i) => {
            const idx = accountsData.length + i;
            const v = VARIANTS[idx % VARIANTS.length];
            const marginTop = idx === 0 ? 0 : -120;
            return (
              <div
                key={`placeholder-${i}`}
                className={`relative block w-full rounded-2xl p-5 ${v.bg} shadow-md`}
                style={{ marginTop, zIndex: totalCards - idx, minHeight: 160 }}
                aria-hidden
              >
                <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full ${v.circle}`} />
                <div className={`absolute right-2 top-6 w-12 h-12 rounded-full ${v.circle}`} />
                <div className="relative flex flex-col h-full">
                  <div className="min-w-0 flex-1 pr-3 mb-4">
                    <p className={`text-sm font-semibold ${v.text}`}>
                      {t("charts.emptySlot", { defaultValue: "Empty slot" })}
                    </p>
                    <p className={`text-xs ${v.sub}`}>
                      {t("charts.addAccountHint", { defaultValue: "Add an account to fill this card" })}
                    </p>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums leading-tight ${v.sub}`}>—</p>
                  <div className={`mt-auto pt-3 flex items-center justify-between text-[11px] uppercase tracking-wider ${v.sub}`}>
                    <span>0 {t("charts.txCount", { defaultValue: "tx" })}</span>
                    <span>—</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* "+" Add account button — always last, on top */}
          {(() => {
            const idx = accountsData.length + placeholdersNeeded;
            const marginTop = idx === 0 ? 0 : -120;
            return (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="relative block w-full rounded-2xl p-5 bg-white border-2 border-dashed border-[#1b76ff]/40 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-[#1b76ff] focus:outline-none focus:ring-2 focus:ring-[#1b76ff]/40 group"
                style={{ marginTop, zIndex: totalCards - idx, minHeight: 160 }}
              >
                <div className="relative flex flex-col items-center justify-center h-full text-center" style={{ minHeight: 120 }}>
                  <div className="w-12 h-12 rounded-full bg-[#1b76ff]/10 flex items-center justify-center mb-2 transition-transform group-hover:scale-110">
                    <Plus className="w-6 h-6 text-[#1b76ff]" strokeWidth={2.5} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("charts.addAccount", { defaultValue: "Add account" })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("charts.addAccountSub", { defaultValue: "Create a new bank account" })}
                  </p>
                </div>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Account detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">{selected.name}</DialogTitle>
                {selected.institution && (
                  <p className="text-sm text-muted-foreground">{selected.institution}</p>
                )}
              </DialogHeader>

              <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {selected.hasRunningBalance
                      ? t("charts.currentBalance", { defaultValue: "Current balance" })
                      : t("charts.netFlow", { defaultValue: "Net flow" })}
                  </p>
                  <p className="text-xl font-bold tabular-nums">{formatCurrency(selected.balance)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {t("charts.txCount", { defaultValue: "Transactions" })}
                  </p>
                  <p className="text-xl font-bold tabular-nums">{selected.transactionCount}</p>
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
                    {t("charts.noTransactions", { defaultValue: "No transactions this month" })}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {[...selected.monthTxs]
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((tx) => (
                        <li key={tx.id} className="flex items-center justify-between py-2.5 gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{tx.date}</p>
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

      {/* Add account dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1b76ff]" />
              {t("charts.addAccount", { defaultValue: "Add account" })}
            </DialogTitle>
            <DialogDescription>
              {t("charts.addAccountDescription", {
                defaultValue: "Create a new bank account. You'll be able to upload statements to it.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              placeholder={t("charts.accountNamePlaceholder", { defaultValue: "e.g. Santander, BBVA, Revolut..." })}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setNewName(""); }}>
              {t("charts.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || isCreating} className="bg-[#1b76ff] hover:bg-[#1b76ff]/90">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {t("charts.create", { defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
