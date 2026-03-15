import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "@/hooks/useAccounts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Building2, Loader2 } from "lucide-react";

export function AccountsManager({ className }: { className?: string }) {
  const { t } = useTranslation('profile');
  const { accounts, createAccount, deleteAccount, isCreating, isDeleting } = useAccounts();
  const cashAccounts = accounts.filter(a => a.account_role === 'CASH');
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createAccount({ name: trimmed, account_role: 'CASH', domain_default: 'CASHFLOW' });
    setNewName("");
  };

  return (
    <div className={`bg-card border rounded-xl p-5 space-y-4 ${className || ''}`}>
      <p className="text-sm text-muted-foreground">
        {t('accounts.managerDescription', 'Manage your bank accounts and cards. These appear when uploading files.')}
      </p>

      {cashAccounts.length > 0 ? (
        <ul className="space-y-2">
          {cashAccounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{account.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteAccount(account.id)}
                disabled={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
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
  );
}
