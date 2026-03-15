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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, Upload, Loader2 } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const cashAccounts = accounts.filter(a => a.account_role === 'CASH');

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleConfirm = () => {
    if (selectedAccountId) {
      onConfirm(selectedAccountId);
      setShowNewForm(false);
      setNewAccountName("");
      setNewInstitution("");
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
          institution: newInstitution.trim() || null,
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
        setNewInstitution("");
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
    } catch (error) {
      console.error('Error creating account:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dashboard-theme bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Select account
          </DialogTitle>
          <DialogDescription>
            {fileName
              ? `Which account does "${fileName}" belong to?`
              : "Which account are these files from?"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!showNewForm ? (
            <>
              <div className="space-y-2">
                <Label>Account / Bank</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{account.name}</span>
                          {account.institution && (
                            <span className="text-muted-foreground text-xs">
                              ({account.institution})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowNewForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add new account
              </Button>
            </>
          ) : (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
              <div className="space-y-1.5">
                <Label htmlFor="account-name">Account name *</Label>
                <Input
                  id="account-name"
                  placeholder="e.g. Santander, BBVA, Revolut..."
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institution">Institution (optional)</Label>
                <Input
                  id="institution"
                  placeholder="e.g. Banco Santander S.A."
                  value={newInstitution}
                  onChange={(e) => setNewInstitution(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewAccountName("");
                    setNewInstitution("");
                  }}
                >
                  Cancel
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
                  Create
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedAccountId}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
