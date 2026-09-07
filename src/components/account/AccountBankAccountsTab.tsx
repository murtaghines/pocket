import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccounts, type Account } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDefaultAccountColor, getAccountDisplayName } from "@/lib/accountColors";
import { AccountFormDialog, type AccountFormValues } from "@/components/settings/AccountFormDialog";
import { getAccountTypeIcon, getAccountTypeI18nKey } from "@/lib/accountTypes";
import { Plus, Pencil, Star, Trash2, Eye, EyeOff, Building2, TrendingUp, Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface AccountCardStatsProps {
  accountId: string;
  getLinkedDataCount: (id: string) => Promise<{
    importsCount: number;
    transactionsCount: number;
    firstMonth: string | null;
    lastMonth: string | null;
    lastImportAt: string | null;
  }>;
}

function AccountCardStats({ accountId, getLinkedDataCount }: AccountCardStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["account-linked-data", accountId],
    queryFn: () => getLinkedDataCount(accountId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 mt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 w-14 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const parts: string[] = [];
  if (stats.importsCount > 0) {
    parts.push(`${stats.importsCount} ${stats.importsCount === 1 ? "file" : "files"}`);
  }

  if (stats.firstMonth && stats.lastMonth) {
    const months =
      stats.firstMonth === stats.lastMonth
        ? `${stats.firstMonth.replace("-", "/")}`
        : `${stats.firstMonth.replace("-", "/")} – ${stats.lastMonth.replace("-", "/")}`;
    parts.push(months);
  }

  if (stats.lastImportAt) {
    parts.push(`last upload ${formatDistanceToNow(new Date(stats.lastImportAt), { addSuffix: true })}`);
  }

  if (parts.length === 0) {
    return <p className="text-xs text-muted-foreground mt-1.5">No uploads yet</p>;
  }

  return (
    <p className="text-xs text-muted-foreground mt-1.5">
      {parts.join(" · ")}
    </p>
  );
}

export function AccountBankAccountsTab() {
  const { t } = useTranslation("account");
  const {
    accounts,
    isLoading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    reassignAndDelete,
    setPrimaryAccount,
    unsetPrimaryAccount,
    isCreating,
    isUpdating,
    isDeleting,
    getLinkedDataCount,
  } = useAccounts();

  const cashAccounts = accounts
    .filter((a) => a.account_role === "CASH")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const investmentAccounts = accounts
    .filter((a) => a.account_role === "INVESTMENT")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [creatingRole, setCreatingRole] = useState<"CASH" | "INVESTMENT">("CASH");

  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [linkedData, setLinkedData] = useState<{
    importsCount: number;
    transactionsCount: number;
    firstMonth: string | null;
    lastMonth: string | null;
    lastImportAt: string | null;
  } | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [checkingLinks, setCheckingLinks] = useState(false);

  const handleOpenCreate = (role: "CASH" | "INVESTMENT" = "CASH") => {
    setCreatingRole(role);
    setEditingAccount(null);
    setFormOpen(true);
  };
  const handleOpenEdit = (account: Account) => { setEditingAccount(account); setFormOpen(true); };

  const handleFormSubmit = (values: AccountFormValues) => {
    if (editingAccount) {
      updateAccount({
        id: editingAccount.id,
        institution: values.institution,
        name: values.name || values.institution,
        color: values.color,
        currency_base: values.currency_base,
        account_number: values.account_number || null,
        hidden_from_dashboard: values.hidden_from_dashboard ?? false,
      });
    } else {
      createAccount({
        institution: values.institution,
        name: values.name,
        color: values.color,
        account_type: values.account_type,
        currency_base: values.currency_base,
        account_number: values.account_number,
        hidden_from_dashboard: values.hidden_from_dashboard,
      });
    }
    setFormOpen(false);
    setEditingAccount(null);
  };

  const handleTogglePrimary = (account: Account) => {
    if (account.is_primary) unsetPrimaryAccount(account.id);
    else setPrimaryAccount(account.id);
  };

  const handleToggleHide = (account: Account) => {
    updateAccount({ id: account.id, hidden_from_dashboard: !account.hidden_from_dashboard });
  };

  const handleDeleteClick = async (account: Account) => {
    setCheckingLinks(true);
    setDeleteTarget(account);
    const data = await getLinkedDataCount(account.id);
    setLinkedData(data);
    setCheckingLinks(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const hasData = linkedData && (linkedData.importsCount > 0 || linkedData.transactionsCount > 0);
    if (hasData && reassignToId) {
      reassignAndDelete({ deleteId: deleteTarget.id, reassignToId });
    } else if (!hasData) {
      deleteAccount(deleteTarget.id);
    }
    setDeleteTarget(null);
    setLinkedData(null);
    setReassignToId("");
  };

  const hasLinkedData = linkedData && (linkedData.importsCount > 0 || linkedData.transactionsCount > 0);
  const otherAccounts = accounts.filter(
    (a) => a.id !== deleteTarget?.id && a.account_role === deleteTarget?.account_role,
  );

  const renderAccountCards = (list: Account[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((account, idx) => {
        const color = account.color || getDefaultAccountColor(idx);
        const TypeIcon = getAccountTypeIcon(account.account_type);
        const typeLabel = t(getAccountTypeI18nKey(account.account_type));
        return (
          <div
            key={account.id}
            className="bg-card rounded-xl border border-border overflow-hidden shadow-section group"
          >
            {/* Color accent bar */}
            <div className="h-1" style={{ backgroundColor: color }} />

            <div className="p-5 space-y-3">
              {/* Header: icon + name + menu */}
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: `${color}18`, color }}
                >
                  <TypeIcon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate leading-tight">
                    {getAccountDisplayName(account)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {typeLabel}
                    </span>
                    {account.currency_base !== "EUR" && (
                      <span className="text-[11px] text-muted-foreground">
                        · {account.currency_base}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {account.is_primary && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-secondary px-1.5 py-0.5 rounded-full bg-secondary/10">
                      {t("accounts.primary", "Primary")}
                    </span>
                  )}
                  {account.hidden_from_dashboard && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
                      {t("accounts.hiddenBadge", "Hidden")}
                    </span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleOpenEdit(account)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        {t("accounts.edit", "Edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePrimary(account)}>
                        <Star className="w-4 h-4 mr-2" fill={account.is_primary ? "currentColor" : "none"} />
                        {account.is_primary
                          ? t("accounts.unsetPrimary", "Remove primary")
                          : t("accounts.setPrimary", "Set as primary")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleHide(account)}>
                        {account.hidden_from_dashboard
                          ? <Eye className="w-4 h-4 mr-2" />
                          : <EyeOff className="w-4 h-4 mr-2" />}
                        {account.hidden_from_dashboard
                          ? t("accounts.showInDashboard", "Show in dashboard")
                          : t("accounts.hideFromDashboard", "Hide from dashboard")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteClick(account)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t("accounts.delete", "Delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Stats */}
              <AccountCardStats accountId={account.id} getLinkedDataCount={getLinkedDataCount} />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
              <div className="h-1 bg-muted" />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted" />
                  </div>
                </div>
                <div className="h-3 w-48 rounded bg-muted mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <p className="text-sm text-destructive text-center py-8">
          Couldn't load your accounts. Try refreshing the page.
        </p>
      )}

      {!isLoading && !error && (
        <>
          {/* ── Bank accounts ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("accounts.bankAccountsTitle", "Bank accounts")}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({cashAccounts.length})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full gap-1.5 text-xs font-medium"
                onClick={() => handleOpenCreate("CASH")}
              >
                <Plus className="w-3.5 h-3.5" />
                {t("accounts.addBankAccount", "Add bank account")}
              </Button>
            </div>
            {cashAccounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center rounded-xl border border-dashed border-border bg-muted/30">
                <Building2 className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {t("accounts.noBankAccounts", "No bank accounts yet.")}
                </p>
              </div>
            ) : (
              renderAccountCards(cashAccounts)
            )}
          </div>

          {/* ── Investment accounts ── */}
          <div className="space-y-4 pt-6 mt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("accounts.investmentAccountsTitle", "Investment accounts")}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({investmentAccounts.length})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full gap-1.5 text-xs font-medium"
                onClick={() => handleOpenCreate("INVESTMENT")}
              >
                <Plus className="w-3.5 h-3.5" />
                {t("accounts.addInvestmentAccount", "Add investment account")}
              </Button>
            </div>
            {investmentAccounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center rounded-xl border border-dashed border-border bg-muted/30">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {t("accounts.noInvestmentAccounts", "No investment accounts yet.")}
                </p>
              </div>
            ) : (
              renderAccountCards(investmentAccounts)
            )}
          </div>
        </>
      )}

      <AccountFormDialog
        key={editingAccount?.id ?? `create-${creatingRole}`}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingAccount(null); }}
        mode={editingAccount ? "edit" : "create"}
        initialValues={
          editingAccount
            ? {
                institution: editingAccount.institution,
                name: editingAccount.name === editingAccount.institution ? "" : editingAccount.name,
                color: editingAccount.color || getDefaultAccountColor(accounts.findIndex((a) => a.id === editingAccount.id)),
                account_type: editingAccount.account_type,
                currency_base: editingAccount.currency_base,
                account_number: editingAccount.account_number ?? undefined,
                hidden_from_dashboard: editingAccount.hidden_from_dashboard,
              }
            : undefined
        }
        typeFilter={creatingRole === "INVESTMENT" ? "investment" : "bank"}
        isSubmitting={isCreating || isUpdating}
        onSubmit={handleFormSubmit}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) { setDeleteTarget(null); setLinkedData(null); setReassignToId(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              {t("accounts.deleteTitle", "Delete account")}
            </DialogTitle>
            <DialogDescription>
              {checkingLinks
                ? t("accounts.checking", "Checking linked data...")
                : hasLinkedData
                  ? t("accounts.hasLinkedData", {
                      name: deleteTarget?.name,
                      imports: linkedData?.importsCount,
                      transactions: linkedData?.transactionsCount,
                      defaultValue: `"${deleteTarget?.name}" has linked files and transactions. Choose another account to reassign them to.`,
                    })
                  : t("accounts.confirmDelete", {
                      name: deleteTarget?.name,
                      defaultValue: `Are you sure you want to delete "${deleteTarget?.name}"? This account has no linked data.`,
                    })}
            </DialogDescription>
          </DialogHeader>

          {checkingLinks && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!checkingLinks && hasLinkedData && (
            <div className="space-y-3 py-2">
              {otherAccounts.length > 0 ? (
                <Select value={reassignToId} onValueChange={setReassignToId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("accounts.reassignPlaceholder", "Move data to...")} />
                  </SelectTrigger>
                  <SelectContent>
                    {otherAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {getAccountDisplayName(a)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-destructive">
                  {t("accounts.noOtherAccounts", "You need at least one other account to reassign data to.")}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteTarget(null); setLinkedData(null); setReassignToId(""); }}
            >
              {t("accounts.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={checkingLinks || (hasLinkedData && (!reassignToId || otherAccounts.length === 0))}
            >
              {hasLinkedData
                ? t("accounts.reassignAndDelete", "Reassign & Delete")
                : t("accounts.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
