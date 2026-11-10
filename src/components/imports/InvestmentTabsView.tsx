import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { uploadFileRejection } from "@/lib/fileExtract";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useImports, type Import } from "@/hooks/useImports";
import { useLocalization } from "@/hooks/useLocalization";
import { useMonthlyInvestmentUpload } from "@/hooks/useMonthlyInvestmentUpload";
import { AccountSelectDialog } from "./AccountSelectDialog";
import { UploadedFilesDropdown } from "./investments/UploadedFiles";
import { MonthTabStrip } from "./investments/MonthTabStrip";
import { MonthWorkspace } from "./investments/MonthWorkspace";
import { InvestmentPreviewDialog } from "./investments/InvestmentPreviewDialog";
import { InvestmentDataToolbar } from "./investments/InvestmentDataToolbar";
import type { InvestmentSummary, InvestmentAccountTab } from "./investments/InvestmentDataToolbar";
import { MobileUploadFAB } from "./MobileUploadFAB";
import type { PendingInvEdit } from "./investments/types";

const DEFAULT_MONTHS = 6;
const MIN_MONTHS = 6;
const MONTHS_INCREMENT = 1;

/* ─────────────────────────  Main component  ───────────────────────── */

interface InvestmentTabsViewProps {
  activeMonth: string | null;
  onMonthChange: (key: string) => void;
}

export function InvestmentTabsView({ activeMonth, onMonthChange }: InvestmentTabsViewProps) {
  const { user } = useAuth();
  const { t } = useTranslation("common");
  const { formatMonth, formatCurrency } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting } = useImports("INVESTING");
  const { getInvestmentAccounts } = useAccounts();
  const investmentAccounts = getInvestmentAccounts();
  const {
    pendingFilesByMonth,
    addFilesForMonth,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
    showPreview,
    previewData,
    previewStats,
    isConfirming,
    saveExchangeRates,
    setSaveExchangeRates,
    confirmPreview,
    cancelPreview,
    updateTransaction,
    removeTransaction,
    removePosition,
  } = useMonthlyInvestmentUpload();

  const [monthsToShow, setMonthsToShow] = useState(() => {
    if (!activeMonth) return DEFAULT_MONTHS;
    const now = new Date();
    const [y, m] = activeMonth.split("-").map(Number);
    const diff = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) + 1;
    return Math.max(DEFAULT_MONTHS, diff);
  });

  // Pending edits live in the parent so they survive month-tab switches.
  const [pendingByInv, setPendingByInv] = useState<Record<string, PendingInvEdit>>({});
  const pendingInvIds = useMemo(() => new Set(Object.keys(pendingByInv)), [pendingByInv]);

  // Account tab state — lifted so InvestmentDataToolbar can render tabs
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [accountTabsData, setAccountTabsData] = useState<InvestmentAccountTab[]>([]);
  const [globalSummary, setGlobalSummary] = useState<InvestmentSummary | undefined>(undefined);
  const handleTabsDataChange = useCallback((data: { tabs: InvestmentAccountTab[]; globalSummary: InvestmentSummary }) => {
    setAccountTabsData(data.tabs);
    setGlobalSummary(data.globalSummary);
  }, []);

  // Map pending inv ids → import_id so the file list shows yellow indicators.
  const { data: pendingInvImportMap = {} } = useQuery({
    queryKey: ["pending-inv-imports", user?.id, Array.from(pendingInvIds).sort().join(",")],
    enabled: !!user?.id && pendingInvIds.size > 0,
    queryFn: async () => {
      const ids = Array.from(pendingInvIds);
      if (ids.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from("investments")
        .select("id, upload_id")
        .in("id", ids);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row: { id: string; upload_id: string | null }) => {
        if (row.upload_id) map[row.id] = row.upload_id;
      });
      return map;
    },
  });

  const pendingImportIds = useMemo(() => {
    const set = new Set<string>();
    pendingInvIds.forEach((id) => {
      const importId = pendingInvImportMap[id];
      if (importId) set.add(importId);
    });
    return set;
  }, [pendingInvIds, pendingInvImportMap]);

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

  const monthsWithData = useMemo(() => new Set(Object.keys(importsByMonth)), [importsByMonth]);
  const firstMonthWithData = useMemo(() => {
    const keys = Object.keys(importsByMonth).sort();
    return keys.length > 0 ? keys[0] : null;
  }, [importsByMonth]);

  const defaultMonth = monthSlots[0]?.key ?? "";
  const activeKey = activeMonth && monthSlots.some((s) => s.key === activeMonth) ? activeMonth : defaultMonth;
  const setActiveKey = onMonthChange;

  const activeSlot = monthSlots.find((s) => s.key === activeKey) ?? monthSlots[0];
  const activeIdx = monthSlots.findIndex((s) => s.key === activeKey);
  const isProcessingAny = useMemo(
    () => Object.values(pendingFilesByMonth).some((arr) => arr.some((f) => f.status === "processing" || f.status === "pending")),
    [pendingFilesByMonth],
  );

  // Month navigation
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

  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // Account-linking dialog state — files are held here until the user picks an account,
  // then addFilesForMonth + processFilesForMonth run with the confirmed accountId.
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingRawFiles, setPendingRawFiles] = useState<File[]>([]);
  const [pendingUploadDate, setPendingUploadDate] = useState<Date | null>(null);

  const handleFilesPicked = (files: FileList | null, monthDate: Date) => {
    if (!files) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      const reason = uploadFileRejection(f);
      if (reason) sonnerToast.error(`Skipped ${f.name}`, { description: reason });
      else valid.push(f);
    }
    if (valid.length) {
      setPendingRawFiles(valid);
      setPendingUploadDate(monthDate);
      setAccountDialogOpen(true);
    }
  };

  const handleAccountConfirm = (accountId: string) => {
    setAccountDialogOpen(false);
    if (!pendingUploadDate || !pendingRawFiles.length) return;
    const added = addFilesForMonth(pendingRawFiles, pendingUploadDate);
    processFilesForMonth(pendingUploadDate, added, accountId);
    setPendingRawFiles([]);
    setPendingUploadDate(null);
  };

  const handleAccountDialogClose = (open: boolean) => {
    setAccountDialogOpen(open);
    if (!open) {
      setPendingRawFiles([]);
      setPendingUploadDate(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Shared hidden file input */}
      <input
        ref={globalFileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".xlsx,.csv,.pdf"
        onChange={(e) => {
          if (e.target.files && activeSlot) {
            handleFilesPicked(e.target.files, activeSlot.date);
          }
          e.target.value = "";
        }}
      />

      {/* ============= Data Toolbar (desktop only) ============= */}
      <InvestmentDataToolbar
        monthLabel={activeSlot?.label ?? ""}
        monthDate={activeSlot?.date ?? new Date()}
        formatCurrency={formatCurrency}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        canGoNext={activeIdx > 0}
        onMonthJump={handleMonthJump}
        monthsWithData={monthsWithData}
        firstMonthWithData={firstMonthWithData}
        onUploadFile={() => globalFileInputRef.current?.click()}
        isProcessing={isProcessingAny}
        accountTabs={accountTabsData}
        activeAccountId={activeAccountId}
        onAccountSelect={setActiveAccountId}
        globalSummary={globalSummary}
        actionSlot={
          <UploadedFilesDropdown
            imports={imports}
            deleteImport={deleteImport}
            isDeleting={isDeleting}
            pendingImportIds={pendingImportIds}
          />
        }
      />

      {/* ============= Month Tab Strip (mobile only) ============= */}
      <div className="md:hidden">
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
      </div>

      {/* ============= Active month workspace ============= */}
      {activeSlot && (
        <MonthWorkspace
          monthKey={activeSlot.key}
          monthLabel={activeSlot.label}
          monthDate={activeSlot.date}
          imports={importsByMonth[activeSlot.key] || []}
          investmentAccounts={investmentAccounts}
          onPickFiles={handleFilesPicked}
          deleteImport={deleteImport}
          isDeleting={isDeleting}
          isProcessing={isProcessingMonth(activeSlot.key)}
          pendingFiles={(pendingFilesByMonth[activeSlot.key] || []).map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            status: f.status,
          }))}
          pendingByInv={pendingByInv}
          setPendingByInv={setPendingByInv}
          activeAccountId={activeAccountId}
          onAccountChange={setActiveAccountId}
          onTabsDataChange={handleTabsDataChange}
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
        ]}
      />

      <AccountSelectDialog
        open={accountDialogOpen}
        onOpenChange={handleAccountDialogClose}
        onConfirm={handleAccountConfirm}
        accountRole="INVESTMENT"
        domainDefault="INVESTING"
        fileName={pendingRawFiles.length === 1 ? pendingRawFiles[0].name : undefined}
      />

      <InvestmentPreviewDialog
        isOpen={showPreview}
        previewData={previewData}
        stats={previewStats}
        isConfirming={isConfirming}
        saveExchangeRates={saveExchangeRates}
        onSaveExchangeRatesChange={setSaveExchangeRates}
        onConfirm={confirmPreview}
        onCancel={cancelPreview}
        onUpdateTransaction={updateTransaction}
        onRemoveTransaction={removeTransaction}
        onRemovePosition={removePosition}
      />
    </div>
  );
}
