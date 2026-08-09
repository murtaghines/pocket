import { useRef, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, PlusCircle, Upload, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Import } from "@/hooks/useImports";
import type { useAccounts } from "@/hooks/useAccounts";
import { getAccountDisplayName } from "@/lib/accountColors";
import { ManualEntryFooter } from "./ManualEntryFooter";
import { InlineTransactionsEditor } from "./InlineTransactionsEditor";
import { ProcessingPanel } from "./ProcessingPanel";
import type { PendingEditShape, PendingFileInfo, MovementType } from "./types";

export interface MonthWorkspaceProps {
  monthKey: string;
  monthLabel: string;
  monthDate: Date;
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  onPickFiles: (files: FileList | null, monthDate: Date) => void;
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  toggleLockImport: (args: { importId: string; locked: boolean }) => void;
  isProcessing: boolean;
  pendingFiles?: PendingFileInfo[];
  pendingByTx: Record<string, PendingEditShape>;
  setPendingByTx: React.Dispatch<React.SetStateAction<Record<string, PendingEditShape>>>;
  pendingTxIds: Set<string>;
  manualEntryOpen?: boolean;
  onManualEntryOpenChange?: (open: boolean) => void;
  defaultMovement?: MovementType;
}

export function MonthWorkspace({
  monthKey,
  monthLabel,
  monthDate,
  imports,
  cashAccounts,
  onPickFiles,
  deleteImport,
  isDeleting,
  toggleLockImport,
  isProcessing,
  pendingFiles,
  pendingByTx,
  setPendingByTx,
  pendingTxIds,
  manualEntryOpen: externalManualEntryOpen,
  onManualEntryOpenChange,
  defaultMovement,
}: MonthWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedAccountId = searchParams.get("account");

  const setAccountFilter = (id: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set("account", id);
        else next.delete("account");
        return next;
      },
      { replace: true }
    );
  };

  // Reset account filter when switching months
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("account");
        return next;
      },
      { replace: true }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  // Build chips from distinct accounts present in this month's imports
  const accountChips = useMemo(() => {
    const countById: Record<string, number> = {};
    imports.forEach((imp) => {
      if (imp.account_id) countById[imp.account_id] = (countById[imp.account_id] ?? 0) + 1;
    });
    return Object.entries(countById).map(([id, count]) => {
      const acct = cashAccounts.find((a) => a.id === id);
      return {
        id,
        label: acct ? getAccountDisplayName(acct) : "Unknown",
        color: acct?.color ?? null,
        count,
      };
    });
  }, [imports, cashAccounts]);

  const filteredImports = selectedAccountId
    ? imports.filter((i) => i.account_id === selectedAccountId)
    : imports;

  const isLocked = filteredImports.some((i) => i.locked);

  const activePending = (pendingFiles || []).filter(
    (f) => f.status === "processing" || f.status === "pending",
  );

  const [internalManualOpen, setInternalManualOpen] = useState(false);
  const manualEntryOpen = externalManualEntryOpen ?? internalManualOpen;
  const setManualEntryOpen = (v: boolean) => {
    setInternalManualOpen(v);
    onManualEntryOpenChange?.(v);
  };

  // Empty state
  if (imports.length === 0) {
    return (
      <div className="bg-card flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 md:py-20">
          {activePending.length > 0 ? (
            <div className="w-full max-w-xl">
              <ProcessingPanel files={activePending} />
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-3">
                <Inbox className="w-5 h-5 text-muted-foreground" />
              </div>
              {/* Mobile: minimal message — the FAB handles actions */}
              <div className="md:hidden">
                <p className="text-[13px] font-semibold text-foreground uppercase">
                  no transactions yet
                </p>
                <p className="text-[12px] text-muted-foreground mt-1 lowercase">
                  press + to add your first entry
                </p>
              </div>
              {/* Desktop: full message with action buttons */}
              <div className="hidden md:block">
                <h3 className="text-base font-semibold text-foreground">
                  {monthLabel} is empty
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Upload a bank statement or add entries manually to start tracking this month.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.pdf"
                    onChange={(e) => onPickFiles(e.target.files, monthDate)}
                  />
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload file
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setManualEntryOpen(true)}
                    className="gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add entry
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        <ManualEntryFooter
          monthKey={monthKey}
          monthLabel={monthLabel}
          importId={null}
          isLocked={false}
          summary={{ total: 0, income: 0, expenses: 0, transfers: 0 }}
          externalOpen={manualEntryOpen}
          onExternalOpenChange={setManualEntryOpen}
          defaultMovement={defaultMovement}
        />
      </div>
    );
  }

  return (
    <div className="bg-card flex-1 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".xlsx,.xls,.csv,.pdf"
        onChange={(e) => onPickFiles(e.target.files, monthDate)}
      />

      {/* Account filter chips — only when 2+ distinct accounts */}
      {accountChips.length > 1 && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/20 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setAccountFilter(null)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
              !selectedAccountId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            All
            <span className="opacity-60">{imports.length}</span>
          </button>
          {accountChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setAccountFilter(chip.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                selectedAccountId === chip.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: chip.color ?? "hsl(var(--muted-foreground))" }}
              />
              {chip.label}
              <span className="opacity-60">{chip.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Inline transactions editor — flush with tabs, true edge-to-edge */}
      <InlineTransactionsEditor
        monthKey={monthKey}
        monthLabel={monthLabel}
        isLocked={isLocked}
        imports={filteredImports}
        cashAccounts={cashAccounts}
        deleteImport={deleteImport}
        isDeleting={isDeleting}
        toggleLockImport={toggleLockImport}
        onAddMore={() => fileInputRef.current?.click()}
        isProcessing={isProcessing}
        pendingFiles={activePending}
        pendingByTx={pendingByTx}
        setPendingByTx={setPendingByTx}
        pendingTxIds={pendingTxIds}
        manualEntryOpen={manualEntryOpen}
        onManualEntryOpenChange={setManualEntryOpen}
        defaultMovement={defaultMovement}
      />
    </div>
  );
}
