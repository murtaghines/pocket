import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "@/hooks/useAccounts";
import type { Transaction } from "@/lib/mockData";
import { Plus, Loader2, ChevronRight, LayoutList, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAccountColorStyle, getDefaultAccountColor } from "@/lib/accountColors";

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
  color: string;
  isPrimary: boolean;
};

export function AccountsStackCard({
  transactions,
  monthKey,
  convert,
  formatCurrency,
}: AccountsStackCardProps) {
  const { t } = useTranslation("dashboard");
  const { accounts, getCashAccounts, createAccount, isCreating } = useAccounts();
  const [detail, setDetail] = useState<AccountDisplay | null>(null);
  // History of selections (most-recent first). Bringing an account to the
  // front pushes it to the head; subsequent picks shift older ones down.
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [allOpen, setAllOpen] = useState(false);

  const promoteAccount = (id: string) => {
    setSelectionOrder((prev) => [id, ...prev.filter((x) => x !== id)]);
  };

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
        color: acc.color || "",
        isPrimary: !!acc.is_primary,
      };
    });

    // Sort by creation date so default colors (by index) stay stable.
    const sorted = mapped.sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    );
    // Resolve color: stored color wins, otherwise default rotation by creation index.
    return sorted.map((acc, i) => ({
      ...acc,
      color: acc.color || getDefaultAccountColor(i),
    }));
  }, [cashAccounts, transactions, monthKey, convert]);

  // Reorder by selection history (LRU): every selected account is moved
  // to the front in the order it was picked. Unselected accounts keep
  // their original creation order behind them.
  const orderedAccounts = useMemo(() => {
    // Primary account is always pinned at the top.
    const primary = accountsData.find((a) => a.isPrimary);
    const rest = accountsData.filter((a) => !a.isPrimary);

    let ordered = rest;
    if (selectionOrder.length > 0) {
      const byId = new Map(rest.map((a) => [a.id, a]));
      const promoted: AccountDisplay[] = [];
      for (const id of selectionOrder) {
        const acc = byId.get(id);
        if (acc) {
          promoted.push(acc);
          byId.delete(id);
        }
      }
      const remaining = rest.filter((a) => byId.has(a.id));
      ordered = [...promoted, ...remaining];
    }

    return primary ? [primary, ...ordered] : ordered;
  }, [accountsData, selectionOrder]);

  // Stack design: keep the visual stack at a fixed, predictable height.
  // - Show up to MAX_VISIBLE real accounts in the stack.
  // - If there are more, replace the last visible slot with a "View all (N)"
  //   card that opens a sheet with the complete list.
  // - The "+" add card always renders at the very bottom of the stack.
  // - When there are few accounts, fill remaining slots with placeholders so
  //   the stack height stays consistent (matches MIN_SLOTS).
  const MIN_SLOTS = 4;
  const MAX_VISIBLE = 4;
  const FRONT_HEIGHT = 160;
  const STRIP_HEIGHT = 40; // fixed visible strip per non-front card
  const overlap = -(FRONT_HEIGHT - STRIP_HEIGHT);

  const overflow = orderedAccounts.length > MAX_VISIBLE;
  // When overflowing, last slot becomes the "View all" card → keep MAX_VISIBLE - 1 real
  const visibleAccounts = overflow
    ? orderedAccounts.slice(0, MAX_VISIBLE - 1)
    : orderedAccounts;
  const placeholdersNeeded = Math.max(0, MIN_SLOTS - visibleAccounts.length - (overflow ? 1 : 0));
  // total cards = visible accounts + (view-all if overflow) + placeholders + add button
  const totalCards =
    visibleAccounts.length + (overflow ? 1 : 0) + placeholdersNeeded + 1;
  let renderIdx = 0;

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
          {visibleAccounts.map((acc, idx) => {
            const v = getAccountColorStyle(acc.color);
            const marginTop = idx === 0 ? 0 : overlap;
            const isFront = idx === 0;
            return (
              <button
                type="button"
                key={acc.id}
                onClick={() => promoteAccount(acc.id)}
                className="relative block w-full text-left rounded-lg p-5 shadow-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#1b76ff]/40"
                style={{ marginTop, zIndex: totalCards - idx, minHeight: FRONT_HEIGHT, backgroundColor: v.bg }}
              >
                {isFront && (
                  <>
                    <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full" style={{ backgroundColor: v.circleBg }} aria-hidden />
                    <div className="absolute right-2 top-6 w-12 h-12 rounded-full" style={{ backgroundColor: v.circleBg }} aria-hidden />
                  </>
                )}

                {isFront ? (
                  <div className="relative flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: v.text }}>
                          {acc.isPrimary && <Star className="w-3 h-3 shrink-0 fill-current" aria-label="Primary" />}
                          <span className="truncate">{acc.name}</span>
                        </p>
                        {acc.institution && (
                          <p className="text-xs truncate" style={{ color: v.sub }}>{acc.institution}</p>
                        )}
                      </div>
                    </div>

                    <p className="text-2xl font-bold tabular-nums leading-tight" style={{ color: v.text }}>
                      {formatCurrency(acc.balance)}
                    </p>

                    <div className="mt-auto pt-3 flex items-center justify-between text-[11px] uppercase tracking-wider" style={{ color: v.sub }}>
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
                        className="inline-flex items-center gap-1 font-semibold cursor-pointer hover:underline"
                        style={{ color: v.text }}
                      >
                        {t("charts.viewDetails", { defaultValue: "View details" })}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ) : (
                  // Hidden card: only show name in the visible bottom strip (~40px)
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-2">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: v.text }}>
                      {acc.isPrimary && <Star className="w-3 h-3 shrink-0 fill-current" aria-label="Primary" />}
                      <span className="truncate">{acc.name}</span>
                    </p>
                  </div>
                )}
              </button>
            );
          })}

          {/* "View all" card — only when accounts exceed visible capacity */}
          {overflow && (() => {
            const idx = visibleAccounts.length;
            const marginTop = idx === 0 ? 0 : overlap;
            const remaining = orderedAccounts.length - visibleAccounts.length;
            return (
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                className="relative block w-full text-left rounded-lg p-5 bg-[#e5e5e0] shadow-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#1b76ff]/40 group"
                style={{ marginTop, zIndex: totalCards - idx, minHeight: FRONT_HEIGHT }}
              >
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                    <LayoutList className="w-4 h-4" />
                    {t("charts.viewAllAccounts", { defaultValue: "View all" })} ({orderedAccounts.length})
                  </span>
                  <span className="text-xs text-foreground/60">+{remaining}</span>
                </div>
              </button>
            );
          })()}

          {/* Empty placeholder slots (solid) */}
          {Array.from({ length: placeholdersNeeded }).map((_, i) => {
            const idx = visibleAccounts.length + (overflow ? 1 : 0) + i;
            const marginTop = idx === 0 ? 0 : overlap;
            return (
              <div
                key={`placeholder-${i}`}
                className="relative block w-full rounded-lg p-5 shadow-md overflow-hidden"
                style={{ marginTop, zIndex: totalCards - idx, minHeight: FRONT_HEIGHT, backgroundColor: "#d2d2cb" }}
                aria-hidden
              >
                {/* Empty slot — intentionally blank */}
              </div>
            );
          })}

          {/* "+" Add account button */}
          {(() => {
            const idx = visibleAccounts.length + (overflow ? 1 : 0) + placeholdersNeeded;
            const marginTop = idx === 0 ? 0 : overlap;
            return (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="relative block w-full rounded-lg p-5 bg-white border-2 border-dashed border-[#1b76ff]/40 shadow-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#1b76ff]/40 group"
                style={{ marginTop, zIndex: totalCards - idx, minHeight: FRONT_HEIGHT }}
              >
                {/* Always show only the "+" aligned to the bottom strip,
                    so it stays visible regardless of how many accounts exist. */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-2 flex justify-center">
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

      {/* All accounts sheet — full list when stack overflows */}
      <Sheet open={allOpen} onOpenChange={setAllOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col text-foreground"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-xl font-semibold text-foreground inline-flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-[#1b76ff]" />
              {t("charts.allAccounts", { defaultValue: "All accounts" })} ({orderedAccounts.length})
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {orderedAccounts.map((acc) => {
              const v = getAccountColorStyle(acc.color);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    promoteAccount(acc.id);
                    setAllOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent text-left transition-colors"
                >
                  <span className="w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: v.bg }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground flex items-center gap-1.5">
                      {acc.isPrimary && <Star className="w-3 h-3 shrink-0 fill-current text-[#ffd027]" aria-label="Primary" />}
                      <span className="truncate">{acc.name}</span>
                    </p>
                    {acc.institution && (
                      <p className="text-xs text-muted-foreground truncate">{acc.institution}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(acc.balance)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {acc.transactionCount} {t("charts.txCount", { defaultValue: "tx" })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
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
