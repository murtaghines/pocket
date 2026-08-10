import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useTranslation } from "react-i18next";
import { getAccountDisplayName } from "@/lib/accountColors";
import { AccountFormDialog, type AccountFormValues } from "@/components/settings/AccountFormDialog";

interface AccountSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (accountId: string) => void;
  fileName?: string;
  accountRole?: 'CASH' | 'INVESTMENT';
  domainDefault?: 'CASHFLOW' | 'INVESTING';
}

export function AccountSelectDialog({
  open,
  onOpenChange,
  onConfirm,
  fileName,
  accountRole = 'CASH',
  domainDefault = 'CASHFLOW',
}: AccountSelectDialogProps) {
  const { accounts, createAccount, isCreating } = useAccounts();
  const { t } = useTranslation('profile');
  const filteredAccounts = accounts.filter(a => a.account_role === accountRole);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showNewForm, setShowNewForm] = useState(false);

  const handleConfirm = () => {
    if (selectedAccountId) {
      onConfirm(selectedAccountId);
      setShowNewForm(false);
    }
  };

  const handleCreateAccount = (values: AccountFormValues) => {
    createAccount(
      { institution: values.institution, name: values.name, color: values.color, account_role: accountRole, domain_default: domainDefault },
      {
        onSuccess: (data) => {
          setSelectedAccountId(data.id);
          setShowNewForm(false);
        },
      },
    );
  };

  const hasAccounts = filteredAccounts.length > 0;

  if (!open) return null;

  const panel = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {t('accounts.selectAccount', 'Select account')}
        </span>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* File info */}
        {fileName && (
          <div className="rounded-xl bg-muted p-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              File
            </span>
            <p className="text-sm font-medium text-foreground mt-1 truncate">
              {fileName}
            </p>
          </div>
        )}

        {/* Account selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('accounts.selectAccount', 'Account')}
          </label>
          {hasAccounts ? (
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-11 rounded-xl bg-muted border-0 shadow-none focus:ring-1 focus:ring-primary [&>svg]:opacity-40">
                <SelectValue placeholder={t('accounts.selectPlaceholder', 'Select an account...')} />
              </SelectTrigger>
              <SelectContent>
                {filteredAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{getAccountDisplayName(account)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t('accounts.noAccountsYet1', 'No accounts yet.')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('accounts.noAccountsYet2', 'Create one to get started.')}
              </p>
            </div>
          )}
        </div>

        {/* Add new account */}
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl gap-2"
          onClick={() => setShowNewForm(true)}
        >
          <Plus className="w-4 h-4" />
          {t('accounts.addNewAccount', 'Add new account')}
        </Button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-3 bg-background space-y-2">
        <Button
          className="w-full h-12 rounded-xl gap-1.5"
          onClick={handleConfirm}
          disabled={!selectedAccountId}
        >
          <Upload className="w-4 h-4" />
          {t('accounts.upload', 'Upload')}
        </Button>
        <Button
          variant="ghost"
          className="w-full h-10 rounded-xl text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          {t('accounts.cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(panel, document.body)}
      <AccountFormDialog
        open={showNewForm}
        onOpenChange={setShowNewForm}
        mode="create"
        isSubmitting={isCreating}
        onSubmit={handleCreateAccount}
      />
    </>
  );
}
