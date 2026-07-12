import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, Upload } from "lucide-react";
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md dashboard-theme bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>
              {t('accounts.selectAccount', 'Select account')}
            </DialogTitle>
            <DialogDescription>
              {fileName
                ? t('accounts.whichAccountFile', { fileName, defaultValue: `Which account does "${fileName}" belong to?` })
                : t('accounts.whichAccount', 'Which account are these files from?')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {hasAccounts ? (
              <div className="space-y-2">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
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
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('accounts.noAccountsYet1', 'No accounts yet.')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('accounts.noAccountsYet2', 'Create one to get started.')}
                </p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('accounts.addNewAccount', 'Add new account')}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('accounts.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedAccountId}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('accounts.upload', 'Upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
