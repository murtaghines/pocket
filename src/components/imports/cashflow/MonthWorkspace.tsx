import { useRef } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Import } from "@/hooks/useImports";
import type { useAccounts } from "@/hooks/useAccounts";
import { ManualEntryFooter } from "./ManualEntryFooter";
import { InlineTransactionsEditor } from "./InlineTransactionsEditor";
import { ProcessingPanel } from "./ProcessingPanel";
import type { PendingEditShape, PendingFileInfo } from "./types";

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
}: MonthWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLocked = imports.some((i) => i.locked);

  const activePending = (pendingFiles || []).filter(
    (f) => f.status === "processing" || f.status === "pending",
  );

  // Empty state
  if (imports.length === 0) {
    return (
      <div className="bg-card flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          {activePending.length > 0 ? (
            <div className="w-full max-w-xl">
              <ProcessingPanel files={activePending} />
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {monthLabel} is empty
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Add a bank statement, credit card bill, or expense report to start
                editing this month's transactions directly. You can also add
                manual entries (e.g. cash) from the bar below.
              </p>
              <div className="mt-5">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={(e) => onPickFiles(e.target.files, monthDate)}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add file
                </Button>
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

      {/* Inline transactions editor — flush with tabs, true edge-to-edge */}
      <InlineTransactionsEditor
        monthKey={monthKey}
        monthLabel={monthLabel}
        isLocked={isLocked}
        imports={imports}
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
      />
    </div>
  );
}
