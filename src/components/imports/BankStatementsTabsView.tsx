import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, Plus, Minus, ArrowRightLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { uploadFileRejection } from "@/lib/fileExtract";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImports, type Import } from "@/hooks/useImports";
import { useAccounts } from "@/hooks/useAccounts";
import { useLocalization } from "@/hooks/useLocalization";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { toast as sonnerToast } from "sonner";
import { AccountSelectDialog } from "./AccountSelectDialog";
import { MonthTabStrip } from "./cashflow/MonthTabStrip";
import { MonthWorkspace } from "./cashflow/MonthWorkspace";
import { DataToolbar, type SortColumn, type SortDirection, type DataFilters } from "./cashflow/DataToolbar";
import { MobileUploadFAB } from "./MobileUploadFAB";
import { DEFAULT_MONTHS, MIN_MONTHS, MONTHS_INCREMENT } from "./cashflow/helpers";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_CATEGORIES } from "@/lib/categoryTranslations";
import type { MovementType } from "./cashflow/types";

/* ─────────────────────────  Main component  ───────────────────────── */

interface BankStatementsTabsViewProps {
  activeMonth: string | null;
  onMonthChange: (key: string) => void;
}

export function BankStatementsTabsView({ activeMonth, onMonthChange }: BankStatementsTabsViewProps) {
  const { user } = useAuth();
  const { t } = useTranslation("common");
  const { formatMonth, formatDate, formatCurrency } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting, toggleLockImport } = useImports("CASHFLOW");
  const { accounts } = useAccounts();
  const {
    addFilesForMonth,
    addFiles,
    isProcessingMonth,
    pendingFilesByMonth,
  } = useMonthlyFileUpload();

  const cashAccounts = accounts.filter((a) => a.account_role === "CASH");
  const [monthsToShow, setMonthsToShow] = useState(() => {
    if (!activeMonth) return DEFAULT_MONTHS;
    const now = new Date();
    const [y, m] = activeMonth.split("-").map(Number);
    const diff = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) + 1;
    return Math.max(DEFAULT_MONTHS, diff);
  });
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [defaultMovement, setDefaultMovement] = useState<MovementType>("EXPENSE");

  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<DataFilters>({ accounts: [], movements: [], categories: [] });

  const allCategories = useMemo(
    () => [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...TRANSFER_CATEGORIES],
    [],
  );

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

  const defaultMonth = monthSlots[0]?.key ?? "";
  const activeKey = activeMonth && monthSlots.some((s) => s.key === activeMonth) ? activeMonth : defaultMonth;
  const setActiveKey = onMonthChange;

  const activeSlot = monthSlots.find((s) => s.key === activeKey) ?? monthSlots[0];
  const activeIdx = monthSlots.findIndex((s) => s.key === activeKey);

  const goPrevMonth = () => {
    if (activeIdx < monthSlots.length - 1) setActiveKey(monthSlots[activeIdx + 1].key);
    else setMonthsToShow((n) => n + MONTHS_INCREMENT);
  };
  const goNextMonth = () => {
    if (activeIdx > 0) setActiveKey(monthSlots[activeIdx - 1].key);
  };
  const handleMonthJump = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const slot = monthSlots.find((s) => s.key === key);
    if (slot) {
      setActiveKey(key);
    } else {
      const now = new Date();
      const diff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth()) + 1;
      setMonthsToShow(Math.max(monthsToShow, diff));
      setTimeout(() => setActiveKey(key), 0);
    }
  };

  const activeImports = importsByMonth[activeKey] || [];
  const isLocked = activeImports.some((i) => i.locked);

  const { data: activeTxCount } = useQuery({
    queryKey: ["tx-count", activeKey, user?.id],
    queryFn: async () => {
      if (!user || !activeKey) return 0;
      const [year, month] = activeKey.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && !!activeKey,
  });

  // Account-select dialog state (when uploading from a tab)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingDate, setPendingDate] = useState<Date | null>(new Date());
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const exportTransactionsRef = useRef<(() => void) | null>(null);

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
      {/* Shared hidden file input */}
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

      {/* ============= Data Toolbar (desktop only) ============= */}
      <DataToolbar
        monthLabel={activeSlot?.label ?? ""}
        monthDate={activeSlot?.date ?? new Date()}
        txCount={activeTxCount ?? 0}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        canGoNext={activeIdx > 0}
        onMonthJump={handleMonthJump}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={(col, dir) => { setSortColumn(col); setSortDirection(dir); }}
        filters={filters}
        onFiltersChange={setFilters}
        accounts={cashAccounts}
        availableCategories={allCategories}
        onAddExpense={() => { setDefaultMovement("EXPENSE"); setManualEntryOpen(true); }}
        onAddIncome={() => { setDefaultMovement("INCOME"); setManualEntryOpen(true); }}
        onAddTransfer={() => { setDefaultMovement("TRANSFER"); setManualEntryOpen(true); }}
        onUploadFile={() => globalFileInputRef.current?.click()}
        onExport={() => exportTransactionsRef.current?.()}
        isLocked={isLocked}
      />

      {/* ============= Month Tab Strip (mobile only) ============= */}
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
        activeTxCount={activeTxCount ?? undefined}
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
          manualEntryOpen={manualEntryOpen}
          onManualEntryOpenChange={setManualEntryOpen}
          defaultMovement={defaultMovement}
          txCount={activeTxCount ?? 0}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          filters={filters}
          exportTransactionsRef={exportTransactionsRef}
        />
      )}

      {/* Mobile FAB */}
      <MobileUploadFAB
        options={[
          {
            label: t("fab.uploadFile", "upload file"),
            icon: <Upload className="w-4 h-4 text-primary" />,
            onClick: () => globalFileInputRef.current?.click(),
          },
          {
            label: t("fab.addTransfer", "add transfer"),
            icon: <ArrowRightLeft className="w-4 h-4 text-warning" />,
            onClick: () => { setDefaultMovement("TRANSFER"); setManualEntryOpen(true); },
          },
          {
            label: t("fab.addIncome", "add income"),
            icon: <Plus className="w-4 h-4 text-success" />,
            onClick: () => { setDefaultMovement("INCOME"); setManualEntryOpen(true); },
          },
          {
            label: t("fab.addExpense", "add expense"),
            icon: <Minus className="w-4 h-4 text-destructive" />,
            onClick: () => { setDefaultMovement("EXPENSE"); setManualEntryOpen(true); },
          },
        ]}
      />

      <AccountSelectDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onConfirm={handleAccountConfirm}
        fileName={pendingFiles[0]?.name}
      />
    </div>
  );
}
