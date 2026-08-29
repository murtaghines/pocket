import { useRef, useState } from "react";
import type { Import } from "@/hooks/useImports";
import type { useAccounts } from "@/hooks/useAccounts";
import { ManualEntryFooter } from "./ManualEntryFooter";
import { InlineTransactionsEditor } from "./InlineTransactionsEditor";
import { ProcessingPanel } from "./ProcessingPanel";
import type { PendingEditShape, PendingFileInfo, MovementType } from "./types";
import type { SortColumn, SortDirection, DataFilters } from "./DataToolbar";

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
  txCount?: number;
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  filters?: DataFilters;
  exportTransactionsRef?: React.MutableRefObject<(() => void) | null>;
  openingBalance?: number | null;
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
  txCount,
  sortColumn,
  sortDirection,
  filters,
  exportTransactionsRef,
  openingBalance,
}: MonthWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLocked = imports.some((i) => i.locked);

  const activePending = (pendingFiles || []).filter(
    (f) => f.status === "processing" || f.status === "pending",
  );

  const [internalManualOpen, setInternalManualOpen] = useState(false);
  const manualEntryOpen = externalManualEntryOpen ?? internalManualOpen;
  const setManualEntryOpen = (v: boolean) => {
    setInternalManualOpen(v);
    onManualEntryOpenChange?.(v);
  };

  const hasTransactions = (txCount ?? 0) > 0;

  // Empty state — only show when no imports AND no standalone transactions
  if (imports.length === 0 && !hasTransactions) {
    return (
      <div className="bg-card flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          {activePending.length > 0 && (
            <div className="w-full max-w-xl">
              <ProcessingPanel files={activePending} />
            </div>
          )}
        </div>
        <ManualEntryFooter
          monthKey={monthKey}
          monthLabel={monthLabel}
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
    <div className="bg-card flex-1 flex flex-col min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".xlsx,.xls,.csv,.pdf"
        onChange={(e) => onPickFiles(e.target.files, monthDate)}
      />

      {/* Inline transactions editor — flush with toolbar */}
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
        manualEntryOpen={manualEntryOpen}
        onManualEntryOpenChange={setManualEntryOpen}
        defaultMovement={defaultMovement}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        filters={filters}
        exportTransactionsRef={exportTransactionsRef}
        openingBalance={openingBalance}
      />
    </div>
  );
}
