import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "@/hooks/useAccounts";
import { Input } from "@/components/ui/input";
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
import { Plus, Trash2, Building2, Loader2, Pencil, Check, X } from "lucide-react";
import { ACCOUNT_COLOR_PALETTE, getDefaultAccountColor } from "@/lib/accountColors";

export function AccountsManager({ className }: { className?: string }) {
  const { t } = useTranslation('profile');
  const {
    accounts,
    createAccount,
    updateAccount,
    deleteAccount,
    reassignAndDelete,
    updateAccountColor,
    setPrimaryAccount,
    unsetPrimaryAccount,
    isCreating,
    isDeleting,
    getLinkedDataCount,
  } = useAccounts();
  const cashAccounts = accounts
    .filter(a => a.account_role === 'CASH')
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>("");
  const [editIsPrimary, setEditIsPrimary] = useState<boolean>(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [linkedData, setLinkedData] = useState<{ importsCount: number; transactionsCount: number } | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [checkingLinks, setCheckingLinks] = useState(false);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createAccount({ name: trimmed, account_role: 'CASH', domain_default: 'CASHFLOW' });
    setNewName("");
  };

  const handleStartEdit = (id: string, currentName: string, currentColor: string, isPrimary: boolean) => {
    setEditingId(id);
    setEditName(currentName);
    setEditColor(currentColor);
    setEditIsPrimary(isPrimary);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
    setEditIsPrimary(false);
  };

  const handleSaveEdit = (id: string) => {
    const account = accounts.find(a => a.id === id);
    if (!account) { handleCancelEdit(); return; }
    const trimmed = editName.trim();
    if (trimmed && trimmed !== account.name) {
      updateAccount({ id, name: trimmed });
    }
    if (editColor && editColor.toLowerCase() !== (account.color || '').toLowerCase()) {
      updateAccountColor({ id, color: editColor });
    }
    if (editIsPrimary && !account.is_primary) {
      setPrimaryAccount(id);
    } else if (!editIsPrimary && account.is_primary) {
      unsetPrimaryAccount(id);
    }
    handleCancelEdit();
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
        <p className="text-xs text-muted-foreground">
          {t('accounts.managerDescription', 'Manage your bank accounts and cards. These appear when uploading files.')}
        </p>

        {cashAccounts.length > 0 ? (
          <ul className="space-y-2">
            {cashAccounts.map((account, idx) => {
              const resolvedColor = account.color || getDefaultAccountColor(idx);
              return (
              <li key={account.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                {editingId === account.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(account.id);
                        if (e.key === 'Escape') { setEditingId(null); setEditName(""); }
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary" onClick={() => handleSaveEdit(account.id)}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingId(null); setEditName(""); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label={t('accounts.changeColor', 'Change color')}
                            className="w-6 h-6 rounded-full border border-border shrink-0 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
                            style={{ backgroundColor: resolvedColor }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="start">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              {t('accounts.color', 'Color')}
                            </p>
                            <div className="flex gap-1.5">
                              {ACCOUNT_COLOR_PALETTE.blues.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => updateAccountColor({ id: account.id, color: c })}
                                  className={`w-7 h-7 rounded-full border transition-transform hover:scale-110 ${
                                    resolvedColor.toLowerCase() === c.toLowerCase()
                                      ? 'ring-2 ring-offset-2 ring-foreground'
                                      : 'border-border'
                                  }`}
                                  style={{ backgroundColor: c }}
                                  aria-label={c}
                                />
                              ))}
                            </div>
                            <div className="flex gap-1.5">
                              {ACCOUNT_COLOR_PALETTE.yellows.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => updateAccountColor({ id: account.id, color: c })}
                                  className={`w-7 h-7 rounded-full border transition-transform hover:scale-110 ${
                                    resolvedColor.toLowerCase() === c.toLowerCase()
                                      ? 'ring-2 ring-offset-2 ring-foreground'
                                      : 'border-border'
                                  }`}
                                  style={{ backgroundColor: c }}
                                  aria-label={c}
                                />
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <span className="text-sm font-medium truncate">{account.name}</span>
                      {account.is_primary && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#ffd027]/20 text-[#7a5c00] font-semibold shrink-0">
                          {t('accounts.primaryBadge', 'Primary')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${account.is_primary ? 'text-[#ffd027]' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => account.is_primary ? unsetPrimaryAccount(account.id) : setPrimaryAccount(account.id)}
                        aria-label={t('accounts.setPrimary', 'Set as primary')}
                        title={t('accounts.setPrimary', 'Set as primary')}
                      >
                        <Star className={`w-3.5 h-3.5 ${account.is_primary ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleStartEdit(account.id, account.name)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteClick(account)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground/70 text-center py-4">
            {t('accounts.noAccountsYet', 'No accounts yet. Create one to get started.')}
          </p>
        )}

        <div className="flex gap-2">
          <Input
            placeholder={t('accounts.namePlaceholder', 'e.g. Santander, BBVA, Revolut...')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1"
          />
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            {t('accounts.addAccount', 'Add')}
          </Button>
        </div>
      </div>

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
                          <span>{a.name}</span>
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
