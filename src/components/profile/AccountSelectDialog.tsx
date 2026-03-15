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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, Upload, Loader2, Inbox } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface AccountSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (accountId: string) => void;
  fileName?: string;
}

export function AccountSelectDialog({
  open,
  onOpenChange,
  onConfirm,
  fileName,
}: AccountSelectDialogProps) {
  const { accounts } = useAccounts();
  const { user } = useAuth();
  const { t } = useTranslation('profile');
  const queryClient = useQueryClient();
  const cashAccounts = accounts.filter(a => a.account_role === 'CASH');

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleConfirm = () => {
    if (selectedAccountId) {
      onConfirm(selectedAccountId);
      setShowNewForm(false);
      setNewAccountName("");
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim() || !user) return;
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: newAccountName.trim(),
          account_role: 'CASH' as const,
          domain_default: 'CASHFLOW' as const,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setSelectedAccountId(data.id);
        setShowNewForm(false);
        setNewAccountName("");
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
    } catch (error) {
      console.error('Error creating account:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const hasAccounts = cashAccounts.length > 0;

  return (
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
          {!showNewForm ? (
            <>
              {hasAccounts ? (
                <div className="space-y-2">
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('accounts.selectPlaceholder', 'Select an account...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{account.name}</span>
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
            </>
          ) : (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
              <div className="space-y-1.5">
                <Input
                  placeholder={t('accounts.namePlaceholder', 'e.g. Santander, BBVA, Revolut...')}
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewAccountName("");
                  }}
                >
                  {t('accounts.cancel', 'Cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateAccount}
                  disabled={!newAccountName.trim() || isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {t('accounts.create', 'Create')}
                </Button>
              </div>
            </div>
          )}
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
  );
}
