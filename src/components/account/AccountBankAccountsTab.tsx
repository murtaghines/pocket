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
import { Plus, Pencil, Star, Trash2, Eye, EyeOff, Building2, Loader2 } from "lucide-react";
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

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [linkedData, setLinkedData] = useState<{
    importsCount: number;
    transactionsCount: number;
    firstMonth: string | null;
    lastMonth: string | null;
    lastImportAt: string | null;
  } | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [checkingLinks, setCheckingLinks] = useState(false);

  const handleOpenCreate = () => { setEditingAccount(null); setFormOpen(true); };
  const handleOpenEdit = (account: Account) => { setEditingAccount(account); setFormOpen(true); };

  const handleFormSubmit = (values: AccountFormValues) => {
    if (editingAccount) {
      updateAccount({ id: editingAccount.id, institution: values.institution, name: values.name || values.institution, color: values.color });
    } else {
      createAccount({ institution: values.institution, name: values.name, color: values.color, account_role: "CASH", domain_default: "CASHFLOW" });
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

  const handleDeleteClick = async (account: { id: string; name: string }) => {
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
  const otherAccounts = cashAccounts.filter((a) => a.id !== deleteTarget?.id);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl p-5 animate-pulse" style={{ minHeight: 100 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
              </div>
              <div className="h-3 w-48 rounded bg-muted mt-2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8">
          Couldn't load your accounts. Try refreshing the page.
        </p>
      ) : cashAccounts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t("accounts.noAccounts", "No accounts yet. Create one to get started.")}
          </p>
          <Button variant="outline" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1" />
            {t("accounts.addAccount", "Add account")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cashAccounts.map((account, idx) => {
            const color = account.color || getDefaultAccountColor(idx);
            return (
              <div
                key={account.id}
                className="bg-card rounded-xl p-5 relative"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {/* Header row */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-semibold text-foreground truncate flex-1">
                    {getAccountDisplayName(account)}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {account.is_primary && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-secondary px-1.5 py-0.5 rounded-full bg-secondary/10 mr-1">
                        {t("accounts.primary", "Primary")}
                      </span>
                    )}
                    {account.hidden_from_dashboard && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted mr-1">
                        {t("accounts.hiddenBadge", "Hidden")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <AccountCardStats accountId={account.id} getLinkedDataCount={getLinkedDataCount} />

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 ${account.is_primary ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}
                    onClick={() => handleTogglePrimary(account)}
                    title={account.is_primary ? t("accounts.unsetPrimary", "Remove primary") : t("accounts.setPrimary", "Set as primary")}
                  >
                    <Star className="w-3.5 h-3.5" fill={account.is_primary ? "currentColor" : "none"} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenEdit(account)}
                    title={t("accounts.edit", "Edit")}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleToggleHide(account)}
                    title={
                      account.hidden_from_dashboard
                        ? t("accounts.showInDashboard", "Show in dashboard")
                        : t("accounts.hideFromDashboard", "Hide from dashboard")
                    }
                  >
                    {account.hidden_from_dashboard ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive ml-auto"
                    onClick={() => handleDeleteClick(account)}
                    disabled={isDeleting}
                    title={t("accounts.delete", "Delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={handleOpenCreate}>
        <Plus className="w-4 h-4 mr-1" />
        {t("accounts.addAccount", "Add account")}
      </Button>

      <AccountFormDialog
        key={editingAccount?.id ?? "create"}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingAccount(null); }}
        mode={editingAccount ? "edit" : "create"}
        initialValues={
          editingAccount
            ? {
                institution: editingAccount.institution,
                name: editingAccount.name === editingAccount.institution ? "" : editingAccount.name,
                color: editingAccount.color || getDefaultAccountColor(cashAccounts.findIndex((a) => a.id === editingAccount.id)),
              }
            : undefined
        }
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
