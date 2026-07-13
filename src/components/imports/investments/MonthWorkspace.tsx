import { useRef, useState, useMemo } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Import } from "@/hooks/useImports";
import type { Account } from "@/hooks/useAccounts";
import { getAccountDisplayName, getDefaultAccountColor } from "@/lib/accountColors";
import { InlineInvestmentsEditor } from "./InlineInvestmentsEditor";
import { ProcessingPanel } from "./ProcessingPanel";
import type { PendingFileInfo, PendingInvEdit } from "./types";

export interface MonthWorkspaceProps {
  monthKey: string;
  monthLabel: string;
  monthDate: Date;
  imports: Import[];
  investmentAccounts: Account[];
  onPickFiles: (files: FileList | null, monthDate: Date) => void;
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  isProcessing: boolean;
  pendingFiles?: PendingFileInfo[];
  pendingByInv: Record<string, PendingInvEdit>;
  setPendingByInv: React.Dispatch<React.SetStateAction<Record<string, PendingInvEdit>>>;
}

export function MonthWorkspace({
  monthKey,
  monthLabel,
  monthDate,
  imports,
  investmentAccounts,
  onPickFiles,
  deleteImport,
  isDeleting,
  isProcessing,
  pendingFiles,
  pendingByInv,
  setPendingByInv,
}: MonthWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const accountChips = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; color: string | null; count: number }>();
    imports.forEach((imp) => {
      if (!imp.account_id) return;
      const account = investmentAccounts.find((a) => a.id === imp.account_id);
      if (!account) return;
      const existing = seen.get(imp.account_id);
      if (existing) {
        existing.count++;
      } else {
        const idx = investmentAccounts.indexOf(account);
        seen.set(imp.account_id, {
          id: imp.account_id,
          label: getAccountDisplayName(account),
          color: account.color || getDefaultAccountColor(idx),
          count: 1,
        });
      }
    });
    return Array.from(seen.values());
  }, [imports, investmentAccounts]);

  const filteredImports = useMemo(
    () => (selectedAccountId ? imports.filter((i) => i.account_id === selectedAccountId) : imports),
    [imports, selectedAccountId],
  );

  const filterUploadIds = useMemo(
    () => (selectedAccountId ? new Set(filteredImports.map((i) => i.id)) : undefined),
    [selectedAccountId, filteredImports],
  );

  const activePending = (pendingFiles || []).filter(
    (f) => f.status === "processing" || f.status === "pending",
  );

  // Empty state
  if (imports.length === 0) {
    return (
      <div className="bg-card py-20 px-6 text-center flex-1 flex flex-col items-center justify-center">
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
              Add a broker statement to start editing this month's investment
              movements directly.
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
      {accountChips.length > 1 && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/20 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedAccountId(null)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
              !selectedAccountId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            All <span className="opacity-60">{imports.length}</span>
          </button>
          {accountChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSelectedAccountId(chip.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                selectedAccountId === chip.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: chip.color ?? "hsl(var(--muted-foreground))" }}
              />
              {chip.label} <span className="opacity-60">{chip.count}</span>
            </button>
          ))}
        </div>
      )}
      <InlineInvestmentsEditor
        monthKey={monthKey}
        monthLabel={monthLabel}
        imports={imports}
        deleteImport={deleteImport}
        isDeleting={isDeleting}
        onAddMore={() => fileInputRef.current?.click()}
        isProcessing={isProcessing}
        pendingFiles={activePending}
        pendingByInv={pendingByInv}
        setPendingByInv={setPendingByInv}
        filterUploadIds={filterUploadIds}
      />
    </div>
  );
}
