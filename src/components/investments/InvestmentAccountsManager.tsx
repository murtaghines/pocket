import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInvestments } from "@/hooks/useInvestments";
import { Plus, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";

interface Account {
  id: string;
  platform: string;
  account_name: string;
  current_value: number;
  last_updated: string;
}

interface InvestmentAccountsManagerProps {
  accounts: Account[];
}

export function InvestmentAccountsManager({ accounts }: InvestmentAccountsManagerProps) {
  const { t, i18n } = useTranslation('investments');
  const { formatCurrency } = useLocalization();
  const { upsertAccount, deleteAccount } = useInvestments();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("");
  const [accountName, setAccountName] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform || !accountName || !currentValue) {
      toast.error(t('accounts.fillAllFields'));
      return;
    }

    try {
      await upsertAccount.mutateAsync({
        platform: platform.trim(),
        account_name: accountName.trim(),
        current_value: parseFloat(currentValue),
      });
      toast.success(t('accounts.saved'));
      setOpen(false);
      setPlatform("");
      setAccountName("");
      setCurrentValue("");
    } catch (error) {
      toast.error(t('accounts.errorSaving'));
    }
  };

  const handleDelete = async (accountId: string) => {
    try {
      await deleteAccount.mutateAsync(accountId);
      toast.success(t('accounts.accountDeleted'));
    } catch (error) {
      toast.error(t('accounts.errorDeleting'));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {t('accounts.title')}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {t('accounts.add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('accounts.addOrUpdate')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="platform">{t('accounts.platform')}</Label>
                <Input
                  id="platform"
                  placeholder={t('accounts.platformPlaceholder')}
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="accountName">{t('accounts.accountName')}</Label>
                <Input
                  id="accountName"
                  placeholder={t('accounts.accountNamePlaceholder')}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currentValue">{t('accounts.currentValue')}</Label>
                <Input
                  id="currentValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={upsertAccount.isPending}>
                {upsertAccount.isPending ? t('accounts.saving') : t('accounts.save')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('accounts.noAccounts')}
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{account.platform}</p>
                  <p className="text-sm text-muted-foreground">{account.account_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(account.current_value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(account.last_updated).toLocaleDateString(i18n.language)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(account.id)}
                    disabled={deleteAccount.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
