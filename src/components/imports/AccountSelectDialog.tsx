import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useTranslation } from "react-i18next";
import { getAccountDisplayName, getDefaultAccountColor } from "@/lib/accountColors";
import { getAccountTypeIcon } from "@/lib/accountTypes";
import { AccountFormDialog, type AccountFormValues } from "@/components/settings/AccountFormDialog";
import { type AccountType } from "@/lib/accountTypes";

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
  const filteredAccounts = accounts.filter(a => a.account_role === accountRole && !a.archived);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showNewForm, setShowNewForm] = useState(false);

  const handleConfirm = () => {
    if (selectedAccountId) {
      onConfirm(selectedAccountId);
      setShowNewForm(false);
    }
  };

  const lockedType: AccountType | undefined = accountRole === 'CASH' ? 'CHECKING' : undefined;
  const typeFilter = accountRole === 'INVESTMENT' ? 'investment' as const : undefined;

  const handleCreateAccount = (values: AccountFormValues) => {
    createAccount(
      {
        institution: values.institution,
        name: values.name,
        color: values.color,
        account_type: values.account_type,
        currency_base: values.currency_base,
        account_number: values.account_number,
        initial_balance: values.initial_balance,
        split_percentage: values.split_percentage,
      },
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounts.selectAccount', 'Select account')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('accounts.whichAccount', 'Which account are these files from?')}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {/* File info */}
            {fileName && (
              <div className="rounded-xl bg-muted px-4 py-3">
                <span className="text-[13px] font-medium text-muted-foreground">
                  File
                </span>
                <p className="text-sm text-foreground mt-0.5 truncate">
                  {fileName}
                </p>
              </div>
            )}

            {/* Account selector */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-muted-foreground">
                {t('accounts.selectAccount', 'Select account')}
              </label>
              {hasAccounts ? (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] [&>svg]:opacity-40">
                    <SelectValue placeholder={t('accounts.selectPlaceholder', 'Select an account...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map((account, index) => {
                      const Icon = getAccountTypeIcon(account.account_type);
                      const color = account.color || getDefaultAccountColor(index);
                      return (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{getAccountDisplayName(account)}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-xl bg-muted px-4 py-4 text-center">
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
              variant="ghost"
              className="w-full h-12 rounded-[14px] gap-2 text-[15px] font-semibold border-0 bg-muted text-foreground hover:bg-[hsl(220,13%,91%)]"
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="w-4 h-4" />
              {t('accounts.addNewAccount', 'Add new account')}
            </Button>
          </DialogBody>

          <DialogFooter>
            <Button
              className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]"
              onClick={handleConfirm}
              disabled={!selectedAccountId}
            >
              <Upload className="w-4 h-4" />
              {t('accounts.upload', 'Upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccountFormDialog
        open={showNewForm}
        onOpenChange={setShowNewForm}
        mode="create"
        lockedType={lockedType}
        typeFilter={typeFilter}
        isSubmitting={isCreating}
        onSubmit={handleCreateAccount}
      />
    </>
  );
}
