import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Trash2, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAccounts, type Account } from "@/hooks/useAccounts";
import { getAccountDisplayName } from "@/lib/accountColors";

interface LinkedData {
  importsCount: number;
  transactionsCount: number;
}

interface AccountDeleteDialogProps {
  account: Account | null;
  onClose: () => void;
}

export function AccountDeleteDialog({ account, onClose }: AccountDeleteDialogProps) {
  const { t } = useTranslation("account");
  const { accounts, deleteAccount, forceDeleteAccount, reassignAndDelete, getLinkedDataCount } = useAccounts();

  const [linkedData, setLinkedData] = useState<LinkedData | null>(null);
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<"choose" | "reassign" | "destroy">("choose");
  const [reassignToId, setReassignToId] = useState("");

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    setChecking(true);
    setLinkedData(null);
    setMode("choose");
    setReassignToId("");
    getLinkedDataCount(account.id).then((data) => {
      if (cancelled) return;
      setLinkedData(data);
      setChecking(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id]);

  const hasLinkedData = !!linkedData && (linkedData.importsCount > 0 || linkedData.transactionsCount > 0);
  const otherAccounts = accounts.filter((a) => a.id !== account?.id && !a.archived && a.account_role === account?.account_role);

  const handleConfirm = () => {
    if (!account) return;
    if (!hasLinkedData) deleteAccount(account.id);
    else if (mode === "reassign" && reassignToId) reassignAndDelete({ deleteId: account.id, reassignToId });
    else if (mode === "destroy") forceDeleteAccount(account.id);
    onClose();
  };

  return (
    <Dialog open={!!account} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            {t("accounts.deleteTitle", "Delete account")}
          </DialogTitle>
          <DialogDescription>
            {checking
              ? t("accounts.checking", "Checking linked data...")
              : hasLinkedData
                ? t("accounts.deleteHasData", {
                    name: account?.name,
                    imports: linkedData?.importsCount,
                    transactions: linkedData?.transactionsCount,
                    defaultValue: `"${account?.name}" has {{imports}} file(s) and {{transactions}} transaction(s). What would you like to do with the data?`,
                  })
                : t("accounts.confirmDelete", {
                    name: account?.name,
                    defaultValue: `Are you sure you want to delete "${account?.name}"? This account has no linked data.`,
                  })}
          </DialogDescription>
        </DialogHeader>

        {checking && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!checking && hasLinkedData && mode === "choose" && (
          <div className="space-y-2 py-2">
            {otherAccounts.length > 0 && (
              <button
                type="button"
                className="w-full flex items-start gap-3 rounded-xl border border-border p-4 text-left hover:bg-accent/50 transition-colors"
                onClick={() => setMode("reassign")}
              >
                <ArrowRightLeft className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("accounts.deleteOptionReassign", "Move data to another account")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("accounts.deleteOptionReassignDesc", "Files and transactions will be transferred to the account you choose")}
                  </p>
                </div>
              </button>
            )}
            <button
              type="button"
              className="w-full flex items-start gap-3 rounded-xl border border-destructive/30 p-4 text-left hover:bg-destructive/5 transition-colors"
              onClick={() => setMode("destroy")}
            >
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {t("accounts.deleteOptionDestroy", "Delete account and all data")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("accounts.deleteOptionDestroyDesc", "All files, transactions and history will be permanently deleted")}
                </p>
              </div>
            </button>
          </div>
        )}

        {!checking && hasLinkedData && mode === "reassign" && (
          <div className="space-y-3 py-2">
            <div className="pk-select-wrap">
              <select
                value={reassignToId}
                onChange={(e) => setReassignToId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>{t("accounts.reassignPlaceholder", "Move data to...")}</option>
                {otherAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{getAccountDisplayName(a)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!checking && hasLinkedData && mode === "destroy" && (
          <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
            <p className="text-sm text-destructive font-medium">
              {t("accounts.deleteDestroyWarning", {
                imports: linkedData?.importsCount,
                transactions: linkedData?.transactionsCount,
                defaultValue: "This will permanently delete {{imports}} file(s) and {{transactions}} transaction(s). This cannot be undone.",
              })}
            </p>
          </div>
        )}

        <DialogFooter>
          {hasLinkedData && mode !== "choose" ? (
            <>
              <Button variant="outline" onClick={() => setMode("choose")}>
                {t("accounts.back", "Back")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={mode === "reassign" && !reassignToId}
              >
                {mode === "reassign"
                  ? t("accounts.reassignAndDelete", "Reassign & Delete")
                  : t("accounts.deleteEverything", "Delete everything")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                {t("accounts.cancel", "Cancel")}
              </Button>
              {!hasLinkedData && (
                <Button variant="destructive" onClick={handleConfirm} disabled={checking}>
                  {t("accounts.delete", "Delete")}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
