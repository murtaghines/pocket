import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInvestments } from "@/hooks/useInvestments";
import { Plus, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

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
  const { upsertAccount, deleteAccount } = useInvestments();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("");
  const [accountName, setAccountName] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform || !accountName || !currentValue) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await upsertAccount.mutateAsync({
        platform: platform.trim(),
        account_name: accountName.trim(),
        current_value: parseFloat(currentValue),
      });
      toast.success("Account saved successfully");
      setOpen(false);
      setPlatform("");
      setAccountName("");
      setCurrentValue("");
    } catch (error) {
      toast.error("Error saving account");
    }
  };

  const handleDelete = async (accountId: string) => {
    try {
      await deleteAccount.mutateAsync(accountId);
      toast.success("Account deleted");
    } catch (error) {
      toast.error("Error deleting account");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Investment Accounts
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add or Update Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="platform">Platform</Label>
                <Input
                  id="platform"
                  placeholder="E.g.: Revolut, Fidelity, Vanguard"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="E.g.: Instant Access Savings, ETF Portfolio"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currentValue">Current Value ($)</Label>
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
                {upsertAccount.isPending ? "Saving..." : "Save Account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No accounts registered. Add one to track current value.
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
                      {new Date(account.last_updated).toLocaleDateString('en-US')}
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
