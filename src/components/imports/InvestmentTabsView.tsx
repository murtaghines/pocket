import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { uploadFileRejection } from "@/lib/fileExtract";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  const { formatMonth } = useLocalization();
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
    previewInvestments,
    isConfirming,
    confirmPreview,
    cancelPreview,
  } = useMonthlyInvestmentUpload();

  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS);

  // Pending edits live in the parent so they survive month-tab switches.
  const [pendingByInv, setPendingByInv] = useState<Record<string, PendingInvEdit>>({});
  const pendingInvIds = useMemo(() => new Set(Object.keys(pendingByInv)), [pendingByInv]);

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

  const defaultMonth = monthSlots[0]?.key ?? "";
  const activeKey = activeMonth && monthSlots.some((s) => s.key === activeMonth) ? activeMonth : defaultMonth;
  const setActiveKey = onMonthChange;

  const activeSlot = monthSlots.find((s) => s.key === activeKey) ?? monthSlots[0];
  const isProcessingAny = useMemo(
    () => Object.values(pendingFilesByMonth).some((arr) => arr.some((f) => f.status === "processing" || f.status === "pending")),
    [pendingFilesByMonth],
  );

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
    <div className="flex flex-col min-h-screen">
      {/* Shared hidden file input */}
      <input
        ref={globalFileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".xlsx,.xls,.csv,.pdf"
        onChange={(e) => {
          if (e.target.files && activeSlot) {
            handleFilesPicked(e.target.files, activeSlot.date);
          }
          e.target.value = "";
        }}
      />

      {/* ============= Toolbar (desktop only): actions ============= */}
      <div className="hidden md:flex items-center justify-end gap-2 px-10 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => globalFileInputRef.current?.click()}
            disabled={isProcessingAny}
            className="flex gap-2 h-9 px-5 font-medium"
          >
            {isProcessingAny ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Add file
          </Button>
          <UploadedFilesDropdown
            imports={imports}
            deleteImport={deleteImport}
            isDeleting={isDeleting}
            pendingImportIds={pendingImportIds}
          />
        </div>
      </div>

      {/* ============= Month Tab Strip ============= */}
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
        investments={previewInvestments}
        isConfirming={isConfirming}
        onConfirm={confirmPreview}
        onCancel={cancelPreview}
      />
    </div>
  );
}
