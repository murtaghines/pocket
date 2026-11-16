import { useState } from "react";
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
import { GitBranch, Trash2, Plus, ArrowRight } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useImports, type SplitDecision } from "@/hooks/useImports";
import { useTranslation } from "react-i18next";
import { getAccountDisplayName } from "@/lib/accountColors";
import { AccountFormDialog, type AccountFormValues } from "@/components/settings/AccountFormDialog";
import type { PendingSplit } from "@/hooks/useMonthlyFileUpload";

type TrackAction = "assign" | "create" | "discard";

interface TrackDecisionState {
  action: TrackAction;
  accountId?: string;
}

interface ImportSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingSplit: PendingSplit;
  primaryAccountId?: string;
}

export function ImportSplitDialog({
  open,
  onOpenChange,
  pendingSplit,
  primaryAccountId,
}: ImportSplitDialogProps) {
  const { t } = useTranslation("common");
  const { accounts, createAccount, isCreating } = useAccounts();
  const { resolveImportSplit, isResolvingSplit } = useImports("CASHFLOW");
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number | null>(null);

  const secondaryTracks = pendingSplit.tracks.filter((tr) => tr.chain_index !== 0);
  const cashAccounts = accounts.filter(
    (a) => a.account_role === "CASH" && !a.archived && a.id !== primaryAccountId,
  );

  const [decisions, setDecisions] = useState<Record<number, TrackDecisionState>>(() => {
    const init: Record<number, TrackDecisionState> = {};
    for (const tr of secondaryTracks) {
      init[tr.chain_index] = { action: "assign" };
    }
    return init;
  });

  const updateDecision = (chainIndex: number, update: Partial<TrackDecisionState>) => {
    setDecisions((prev) => ({
      ...prev,
      [chainIndex]: { ...prev[chainIndex], ...update },
    }));
  };

  const canSubmit = secondaryTracks.every((tr) => {
    const d = decisions[tr.chain_index];
    if (!d) return false;
    if (d.action === "discard") return true;
    if (d.action === "assign") return !!d.accountId;
    if (d.action === "create") return true;
    return false;
  });

  const handleSubmit = async () => {
    const splitDecisions: SplitDecision[] = secondaryTracks.map((tr) => {
      const d = decisions[tr.chain_index];
      if (d.action === "discard") {
        return { chain_index: tr.chain_index, action: "discard" };
      }
      if (d.action === "assign" && d.accountId) {
        return { chain_index: tr.chain_index, action: "assign", account_id: d.accountId };
      }
      return { chain_index: tr.chain_index, action: "discard" };
    });

    await resolveImportSplit({
      importId: pendingSplit.importId,
      decisions: splitDecisions,
    });
    onOpenChange(false);
  };

  const handleNewAccountCreated = async (values: AccountFormValues) => {
    const newAcct = await createAccount(values);
    if (newAcct && activeTrackIndex !== null) {
      updateDecision(activeTrackIndex, { action: "assign", accountId: newAcct.id });
    }
    setShowNewForm(false);
    setActiveTrackIndex(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              {t("split.dialogTitle", "Multiple accounts detected")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "split.dialogDescription",
                "This file contains transactions from {{count}} separate accounts. Choose where each set of transactions should go.",
                { count: pendingSplit.tracks.length },
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Primary track info */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {t("split.primaryTrack", "Primary account (already assigned)")}
              </div>
              <div className="text-sm font-medium">
                {pendingSplit.tracks[0]?.transaction_count ?? 0}{" "}
                {t("split.transactions", "transactions")}
              </div>
            </div>

            {/* Secondary tracks */}
            {secondaryTracks.map((track) => {
              const d = decisions[track.chain_index];
              return (
                <div
                  key={track.chain_index}
                  className="rounded-lg border border-border p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                        {t("split.secondaryTrack", "Track {{n}}", {
                          n: track.chain_index,
                        })}
                      </div>
                      <div className="text-sm">
                        {track.transaction_count}{" "}
                        {t("split.transactions", "transactions")}
                      </div>
                    </div>
                  </div>

                  {track.sample_descriptions.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {track.sample_descriptions.map((desc, i) => (
                        <div key={i} className="truncate">
                          {desc}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={d?.action === "assign" ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        updateDecision(track.chain_index, {
                          action: "assign",
                          accountId: undefined,
                        })
                      }
                    >
                      <ArrowRight className="w-3.5 h-3.5 mr-1" />
                      {t("split.assignToExisting", "Existing account")}
                    </Button>
                    <Button
                      variant={d?.action === "create" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setActiveTrackIndex(track.chain_index);
                        setShowNewForm(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {t("split.createNew", "New account")}
                    </Button>
                    <Button
                      variant={d?.action === "discard" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() =>
                        updateDecision(track.chain_index, { action: "discard" })
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {t("split.discard", "Discard")}
                    </Button>
                  </div>

                  {/* Account picker for 'assign' */}
                  {d?.action === "assign" && (
                    <div className="space-y-1.5">
                      {cashAccounts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t("split.noOtherAccounts", "No other accounts available. Create one first.")}
                        </p>
                      ) : (
                        <div className="grid gap-1.5">
                          {cashAccounts.map((acct) => (
                            <button
                              key={acct.id}
                              type="button"
                              className={`text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                                d.accountId === acct.id
                                  ? "border-primary bg-accent text-accent-foreground"
                                  : "border-border hover:bg-muted/50"
                              }`}
                              onClick={() =>
                                updateDecision(track.chain_index, {
                                  accountId: acct.id,
                                })
                              }
                            >
                              {getAccountDisplayName(acct)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("split.later", "Decide later")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isResolvingSplit}
            >
              {isResolvingSplit
                ? t("split.resolving", "Resolving...")
                : t("split.confirm", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccountFormDialog
        open={showNewForm}
        onOpenChange={setShowNewForm}
        onSubmit={handleNewAccountCreated}
        isSubmitting={isCreating}
        defaultRole="CASH"
      />
    </>
  );
}
