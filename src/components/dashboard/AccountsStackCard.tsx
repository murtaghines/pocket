import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "@/hooks/useAccounts";
import type { Transaction } from "@/lib/mockData";
import { Plus, Loader2, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  createdAt: string;
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
  const [detail, setDetail] = useState<AccountDisplay | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const cashAccounts = useMemo(() => getCashAccounts(), [accounts]);

  const accountsData = useMemo<AccountDisplay[]>(() => {
    if (!monthKey) return [];

    const mapped = cashAccounts.map((acc) => {
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
        createdAt: acc.created_at,
      };
    });

    // Sort by creation date — first added stays first (top of stack by default)
    return mapped.sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    );
  }, [cashAccounts, transactions, monthKey, convert]);

  // Reorder: if user clicked an account, bring it to the front; else default order.
  const orderedAccounts = useMemo(() => {
    if (!activeId) return accountsData;
    const idx = accountsData.findIndex((a) => a.id === activeId);
    if (idx <= 0) return accountsData;
    const copy = [...accountsData];
    const [picked] = copy.splice(idx, 1);
    copy.unshift(picked);
    return copy;
  }, [accountsData, activeId]);

  // Minimum 4 account slots (real or empty placeholder) + 1 "add" card = 5 total.
  const MIN_ACCOUNT_SLOTS = 4;
  const placeholdersNeeded = Math.max(0, MIN_ACCOUNT_SLOTS - orderedAccounts.length);
  const totalCards = orderedAccounts.length + placeholdersNeeded + 1; // includes add button
  // Stacked (non-front) cards each show a ~56px visible strip at the bottom.
  const STRIP_HEIGHT = 56;
  const stackedCount = totalCards - 1;

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
        <div
          className="relative flex-1"
          style={{ minHeight: 160 + stackedCount * STRIP_HEIGHT }}
        >
          {/* Real account cards */}
          {orderedAccounts.map((acc, idx) => {
            // Variant is fixed by account id position in original (creation) order,
            // so colors don't shuffle when reordering.
            const originalIdx = accountsData.findIndex((a) => a.id === acc.id);
            const v = VARIANTS[originalIdx % VARIANTS.length];
            const isFront = idx === 0;
            // Front card fills entire container; stacked cards anchor to bottom.
            const stackedFromBottom = stackedCount - idx; // 0 = bottom-most
            const positionStyle: React.CSSProperties = isFront
              ? { position: 'absolute', inset: 0 }
              : {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: stackedFromBottom * STRIP_HEIGHT,
                  height: 160,
                };
            return (
              <button
                type="button"
                key={acc.id}
                onClick={() => setActiveId(acc.id)}
                className={`block w-full text-left rounded-2xl p-5 ${v.bg} shadow-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#1b76ff]/40`}
                style={{ ...positionStyle, zIndex: totalCards - idx }}
              >
                {isFront && (
                  <>
                    <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full ${v.circle}`} aria-hidden />
                    <div className={`absolute right-2 top-6 w-12 h-12 rounded-full ${v.circle}`} aria-hidden />
                  </>
                )}

                {isFront ? (
                  <div className="relative flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className={`text-sm font-medium truncate ${v.text}`}>{acc.name}</p>
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
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetail(acc);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            setDetail(acc);
                          }
                        }}
                        className={`inline-flex items-center gap-1 font-semibold cursor-pointer hover:underline ${v.text}`}
                      >
                        {t("charts.viewDetails", { defaultValue: "View details" })}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ) : (
                  // Hidden card: only show name in the visible bottom strip (~40px)
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
                    <p className={`text-sm font-medium truncate ${v.text}`}>{acc.name}</p>
                  </div>
                )}
              </button>
            );
          })}

          {/* Empty placeholder slots (solid) */}
          {Array.from({ length: placeholdersNeeded }).map((_, i) => {
            const idx = orderedAccounts.length + i;
            const v = VARIANTS[idx % VARIANTS.length];
            const isFront = idx === 0;
            const stackedFromBottom = stackedCount - idx;
            const positionStyle: React.CSSProperties = isFront
              ? { position: 'absolute', inset: 0 }
              : {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: stackedFromBottom * STRIP_HEIGHT,
                  height: 160,
                };
            return (
              <div
                key={`placeholder-${i}`}
                className={`block w-full rounded-2xl p-5 ${v.bg} shadow-md overflow-hidden`}
                style={{ ...positionStyle, zIndex: totalCards - idx }}
                aria-hidden
              >
                {/* Empty slot — intentionally blank */}
              </div>
            );
          })}

          {/* "+" Add account button — always last, anchored at the bottom */}
          {(() => {
            const idx = orderedAccounts.length + placeholdersNeeded;
            const isFront = idx === 0;
            const positionStyle: React.CSSProperties = isFront
              ? { position: 'absolute', inset: 0 }
              : {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 160,
                };
            return (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="block w-full rounded-2xl p-5 bg-white border-2 border-dashed border-[#1b76ff]/40 shadow-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#1b76ff]/40 group"
                style={{ ...positionStyle, zIndex: totalCards - idx }}
              >
                {/* Always show only the "+" aligned to the bottom strip,
                    so it stays visible regardless of how many accounts exist. */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-3 flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#1b76ff]/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Plus className="w-5 h-5 text-[#1b76ff]" strokeWidth={2.5} />
                  </div>
                </div>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Account detail side sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col text-foreground"
        >
          {detail && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-xl font-semibold text-foreground">
                  {detail.name}
                </SheetTitle>
                {detail.institution && (
                  <p className="text-sm text-muted-foreground">{detail.institution}</p>
                )}
              </SheetHeader>

              <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {detail.hasRunningBalance
                      ? t("charts.currentBalance", { defaultValue: "Current balance" })
                      : t("charts.netFlow", { defaultValue: "Net flow" })}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {formatCurrency(detail.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {t("charts.txCount", { defaultValue: "Transactions" })}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {detail.transactionCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {t("charts.currency", { defaultValue: "Currency" })}
                  </p>
                  <p className="text-lg font-bold text-foreground">{detail.currency}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {detail.monthTxs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("charts.noTransactions", { defaultValue: "No transactions this month" })}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {[...detail.monthTxs]
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((tx) => (
                        <li key={tx.id} className="flex items-center justify-between py-2.5 gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate text-foreground">
                              {tx.description}
                            </p>
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
