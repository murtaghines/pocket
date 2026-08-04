import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { uploadFileRejection } from "@/lib/fileExtract";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useImports, type Import } from "@/hooks/useImports";
import { useAccounts } from "@/hooks/useAccounts";
import { useLocalization } from "@/hooks/useLocalization";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { toast as sonnerToast } from "sonner";
import { AccountSelectDialog } from "./AccountSelectDialog";
import { UploadedFilesDropdown } from "./cashflow/UploadedFiles";
import { MonthTabStrip } from "./cashflow/MonthTabStrip";
import { MonthWorkspace } from "./cashflow/MonthWorkspace";
import { DataSectionToggle, type DataTab } from "./DataSectionToggle";
import { DEFAULT_MONTHS, MIN_MONTHS, MONTHS_INCREMENT } from "./cashflow/helpers";
import type { MovementType } from "./cashflow/types";

/* ─────────────────────────  Main component  ───────────────────────── */

interface BankStatementsTabsViewProps {
  tab: DataTab;
  onTabChange: (t: DataTab) => void;
}

export function BankStatementsTabsView({ tab, onTabChange }: BankStatementsTabsViewProps) {
  const { user } = useAuth();
  const { formatMonth, formatDate, formatCurrency } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting, toggleLockImport } = useImports("CASHFLOW");
  const { accounts } = useAccounts();
  const {
    addFilesForMonth,
    addFiles,
    isProcessingMonth,
    isProcessingAny,
    pendingFilesByMonth,
    retryImport,
    retryingImportIds,
  } = useMonthlyFileUpload();

  const cashAccounts = accounts.filter((a) => a.account_role === "CASH");
  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS);

  // Pending (unsaved) edits live in the parent so they survive when the
  // user switches to another month tab or navigates the rest of the app.
  // Each row stays visually "yellow" until the user explicitly saves or
  // discards it from the row actions — no modal, no toast.
  type PendingEdit = {
    movement?: MovementType;
    category?: string;
    category_id?: string | null;
    amount?: number;
  };
  const [pendingByTx, setPendingByTx] = useState<Record<string, PendingEdit>>({});
  const pendingTxIds = useMemo(() => new Set(Object.keys(pendingByTx)), [pendingByTx]);

  // Map pending tx ids → their parent import_id, so the file list in the
  // "Manage files" sheet can show a yellow indicator on any file that has
  // unconfirmed edits.
  const { data: pendingTxImportMap = {} } = useQuery({
    queryKey: ["pending-tx-imports", user?.id, Array.from(pendingTxIds).sort().join(",")],
    enabled: !!user?.id && pendingTxIds.size > 0,
    queryFn: async () => {
      const ids = Array.from(pendingTxIds);
      if (ids.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from("transactions")
        .select("id, import_id")
        .in("id", ids);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row: { id: string; import_id: string | null }) => {
        if (row.import_id) map[row.id] = row.import_id;
      });
      return map;
    },
  });

  const pendingImportIds = useMemo(() => {
    const set = new Set<string>();
    pendingTxIds.forEach((txId) => {
      const importId = pendingTxImportMap[txId];
      if (importId) set.add(importId);
    });
    return set;
  }, [pendingTxIds, pendingTxImportMap]);

  // Build month slots: latest first
  const monthSlots = useMemo(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth(), 1);
    return Array.from({ length: monthsToShow }, (_, i) => {
      const d = new Date(last.getFullYear(), last.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: formatMonth(d), date: d };
    });
  }, [monthsToShow, formatMonth]);

  const importsByMonth = useMemo(() => {
    const g: Record<string, Import[]> = {};
    imports.forEach((imp) => {
      const k = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
      (g[k] ??= []).push(imp);
    });
    return g;
  }, [imports]);

  // Active tab (default = latest month)
  const [activeKey, setActiveKey] = useState<string>(() => monthSlots[0]?.key ?? "");
  useEffect(() => {
    if (!activeKey && monthSlots[0]) setActiveKey(monthSlots[0].key);
  }, [monthSlots, activeKey]);

  const activeSlot = monthSlots.find((s) => s.key === activeKey) ?? monthSlots[0];

  // Account-select dialog state (when uploading from a tab)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingDate, setPendingDate] = useState<Date | null>(new Date());
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // Keep only uploadable files; tell the user why any were skipped (bad type / too large).
  const filterUploadable = (files: FileList): File[] => {
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      const reason = uploadFileRejection(f);
      if (reason) sonnerToast.error(`Skipped ${f.name}`, { description: reason });
      else valid.push(f);
    }
    return valid;
  };

  const handleFilesPicked = (files: FileList | null, monthDate: Date) => {
    if (!files) return;
    const valid = filterUploadable(files);
    if (valid.length) {
      setPendingFiles(valid);
      setPendingDate(monthDate);
      setAccountDialogOpen(true);
    }
  };

  // Global "Add bank statement" — no forced month, backend distributes.
  const handleGlobalFilesPicked = (files: FileList | null) => {
    if (!files) return;
    const valid = filterUploadable(files);
    if (valid.length) {
      setPendingFiles(valid);
      setPendingDate(null);
      setAccountDialogOpen(true);
    }
  };

  const handleAccountConfirm = (accountId: string) => {
    setAccountDialogOpen(false);
    if (pendingFiles.length) {
      if (pendingDate) {
        addFilesForMonth(pendingFiles, pendingDate, accountId);
      } else {
        addFiles(pendingFiles, accountId);
      }
      setPendingFiles([]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ============= Toolbar: section toggle (left) + actions (right) ============= */}
      <div className="flex items-center justify-between gap-2 px-4 md:px-10 py-3 md:py-4 border-b border-border bg-card">
        <DataSectionToggle tab={tab} onChange={onTabChange} />

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <input
            ref={globalFileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".xlsx,.xls,.csv,.pdf"
            onChange={(e) => {
              handleGlobalFilesPicked(e.target.files);
              e.target.value = "";
            }}
          />
          {/* Mobile: icon-only upload button */}
          <Button
            size="icon"
            onClick={() => globalFileInputRef.current?.click()}
            disabled={isProcessingAny()}
            className="h-8 w-8 md:hidden"
            title="Upload file"
          >
            {isProcessingAny() ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </Button>
          {/* Desktop: full upload button */}
          <Button
            size="sm"
            onClick={() => globalFileInputRef.current?.click()}
            disabled={isProcessingAny()}
            className="hidden md:flex gap-2 h-9 px-5 font-medium"
            title="Upload one or more files. Transactions are auto-sorted into the right months."
          >
            {isProcessingAny() ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Add file
          </Button>

          {/* Files dropdown — shows every uploaded source file across all months */}
          <UploadedFilesDropdown
            imports={imports}
            cashAccounts={cashAccounts}
            deleteImport={deleteImport}
            isDeleting={isDeleting}
            toggleLockImport={toggleLockImport}
            pendingImportIds={pendingImportIds}
            retryImport={retryImport}
            retryingImportIds={retryingImportIds}
          />
        </div>
      </div>

      {/* ============= Month Tab Strip (Airtable style) ============= */}
      <MonthTabStrip
        slots={monthSlots}
        activeKey={activeKey}
        onActivate={setActiveKey}
        importsByMonth={importsByMonth}
        onLoadMore={() => setMonthsToShow((n) => n + MONTHS_INCREMENT)}
        onShowLess={() =>
          setMonthsToShow((n) => Math.max(MIN_MONTHS, n - MONTHS_INCREMENT))
        }
        canShowLess={monthsToShow > MIN_MONTHS}
      />

      {/* ============= Active month workspace ============= */}
      {activeSlot && (
        <MonthWorkspace
          monthKey={activeSlot.key}
          monthLabel={activeSlot.label}
          monthDate={activeSlot.date}
          imports={importsByMonth[activeSlot.key] || []}
          cashAccounts={cashAccounts}
          onPickFiles={handleFilesPicked}
          deleteImport={deleteImport}
          isDeleting={isDeleting}
          toggleLockImport={toggleLockImport}
          isProcessing={isProcessingMonth(activeSlot.key)}
          pendingFiles={[
            ...(pendingFilesByMonth[activeSlot.key] || []),
            ...(pendingFilesByMonth["__auto__"] || []),
          ]}
          pendingByTx={pendingByTx}
          setPendingByTx={setPendingByTx}
          pendingTxIds={pendingTxIds}
        />
      )}

      <AccountSelectDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onConfirm={handleAccountConfirm}
        fileName={pendingFiles[0]?.name}
      />
    </div>
  );
}
