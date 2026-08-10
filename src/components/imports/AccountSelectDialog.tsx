import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetPanel, SHEET_BUTTON } from "./SheetPanel";
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

  const footer = (
    <Button
      className={cn(SHEET_BUTTON, "w-full gap-1.5")}
      onClick={handleConfirm}
      disabled={!selectedAccountId}
    >
      <Upload className="w-4 h-4" />
      {t('accounts.upload', 'Upload')}
    </Button>
  );

  const panel = (
    <SheetPanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('accounts.selectAccount', 'select account')}
      footer={footer}
    >
      <>
        {/* File info */}
        {fileName && (
          <div className="rounded-2xl bg-muted px-5 py-3">
            <span className="text-[13px] font-semibold text-foreground">
              File
            </span>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {fileName}
            </p>
          </div>
        )}

        {/* Account selector */}
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-foreground">
            {t('accounts.selectAccount', 'Account')}
          </label>
          {hasAccounts ? (
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-11 rounded-full bg-muted border-0 shadow-none px-5 focus:ring-1 focus:ring-primary [&>svg]:opacity-40">
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
            <div className="rounded-2xl bg-muted px-5 py-4 text-center">
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
          className="w-full h-11 rounded-full gap-2 font-semibold"
          onClick={() => setShowNewForm(true)}
        >
          <Plus className="w-4 h-4" />
          {t('accounts.addNewAccount', 'Add new account')}
        </Button>
      </>
    </SheetPanel>
  );

  return (
    <>
      {panel}
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
