import { useRef } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Import } from "@/hooks/useImports";
import { InlineInvestmentsEditor } from "./InlineInvestmentsEditor";
import { ProcessingPanel } from "./ProcessingPanel";
import type { PendingFileInfo, PendingInvEdit } from "./types";

export interface MonthWorkspaceProps {
  monthKey: string;
  monthLabel: string;
  monthDate: Date;
  imports: Import[];
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
  onPickFiles,
  deleteImport,
  isDeleting,
  isProcessing,
  pendingFiles,
  pendingByInv,
  setPendingByInv,
}: MonthWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      />
    </div>
  );
}
