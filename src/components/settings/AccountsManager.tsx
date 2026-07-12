import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Building2, Loader2, Pencil, Star } from "lucide-react";
import { getDefaultAccountColor, getAccountDisplayName } from "@/lib/accountColors";
import { AccountFormDialog, type AccountFormValues } from "./AccountFormDialog";

export function AccountsManager({ className }: { className?: string }) {
  const { t } = useTranslation('profile');
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
    .filter(a => a.account_role === 'CASH')
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [linkedData, setLinkedData] = useState<{ importsCount: number; transactionsCount: number } | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [checkingLinks, setCheckingLinks] = useState(false);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (account: Account) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleFormSubmit = (values: AccountFormValues) => {
    if (editingAccount) {
      updateAccount({
        id: editingAccount.id,
        institution: values.institution,
        name: values.name || values.institution,
        color: values.color,
      });
    } else {
      createAccount({
        institution: values.institution,
        name: values.name,
        color: values.color,
        account_role: 'CASH',
        domain_default: 'CASHFLOW',
      });
    }
    setFormOpen(false);
    setEditingAccount(null);
  };

  const handleTogglePrimary = (account: Account) => {
    if (account.is_primary) {
      unsetPrimaryAccount(account.id);
    } else {
      setPrimaryAccount(account.id);
    }
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
  const otherAccounts = cashAccounts.filter(a => a.id !== deleteTarget?.id);

  return (
    <>
      <div className={`bg-card border rounded-xl p-5 md:p-6 space-y-4 ${className || ''}`} style={{ boxShadow: 'var(--shadow-card)' }}>
        {isLoading ? (
          <ul className="space-y-1.5" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <span className="w-4 h-4 rounded-full bg-muted animate-pulse shrink-0" />
                <span className="h-4 w-32 rounded bg-muted animate-pulse" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <p className="text-sm text-destructive text-center py-4">
            {t('accounts.loadError', "Couldn't load your accounts. Try refreshing the page.")}
          </p>
        ) : cashAccounts.length > 0 ? (
          <ul className="space-y-1.5">
            {cashAccounts.map((account, idx) => {
              const resolvedColor = account.color || getDefaultAccountColor(idx);
              return (
                <li
                  key={account.id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: resolvedColor }}
                    aria-hidden
                  />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-medium truncate text-foreground">
                      {getAccountDisplayName(account)}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 transition-opacity ${
                        account.is_primary
                          ? 'text-secondary opacity-100'
                          : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-secondary'
                      }`}
                      onClick={() => handleTogglePrimary(account)}
                      aria-label={account.is_primary ? t('accounts.primary', 'Primary') : t('accounts.setPrimary', 'Set as primary account')}
                      title={account.is_primary ? t('accounts.primary', 'Primary') : t('accounts.setPrimary', 'Set as primary account')}
                    >
                      <Star className="w-3.5 h-3.5" fill={account.is_primary ? 'currentColor' : 'none'} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleOpenEdit(account)}
                      aria-label={t('accounts.editAccount', 'Edit account')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteClick(account)}
                      disabled={isDeleting}
                      aria-label={t('accounts.delete', 'Delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground/70 text-center py-4">
            {t('accounts.noAccountsYet', 'No accounts yet. Create one to get started.')}
          </p>
        )}

        <Button size="sm" variant="outline" className="w-full" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1" />
          {t('accounts.addAccount', 'Add account')}
        </Button>
      </div>

      <AccountFormDialog
        key={editingAccount?.id ?? 'create'}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingAccount(null); }}
        mode={editingAccount ? 'edit' : 'create'}
        initialValues={editingAccount ? {
          institution: editingAccount.institution,
          name: editingAccount.name === editingAccount.institution ? '' : editingAccount.name,
          color: editingAccount.color || getDefaultAccountColor(cashAccounts.findIndex(a => a.id === editingAccount.id)),
        } : undefined}
        isSubmitting={isCreating || isUpdating}
        onSubmit={handleFormSubmit}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setLinkedData(null); setReassignToId(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              {t('accounts.deleteTitle', 'Delete account')}
            </DialogTitle>
            <DialogDescription>
              {checkingLinks
                ? t('accounts.checking', 'Checking linked data...')
                : hasLinkedData
                  ? t('accounts.hasLinkedData', {
                      name: deleteTarget?.name,
                      imports: linkedData?.importsCount,
                      transactions: linkedData?.transactionsCount,
                      defaultValue: `"${deleteTarget?.name}" has ${linkedData?.importsCount} linked file(s) and ${linkedData?.transactionsCount} transaction(s). Choose another account to reassign them to.`
                    })
                  : t('accounts.confirmDelete', {
                      name: deleteTarget?.name,
                      defaultValue: `Are you sure you want to delete "${deleteTarget?.name}"? This account has no linked data.`
                    })
              }
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
                    <SelectValue placeholder={t('accounts.reassignPlaceholder', 'Move data to...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {otherAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{getAccountDisplayName(a)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-destructive">
                  {t('accounts.noOtherAccounts', 'You need at least one other account to reassign data to. Create a new account first.')}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setLinkedData(null); setReassignToId(""); }}>
              {t('accounts.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={checkingLinks || (hasLinkedData && (!reassignToId || otherAccounts.length === 0))}
            >
              {hasLinkedData ? t('accounts.reassignAndDelete', 'Reassign & Delete') : t('accounts.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
