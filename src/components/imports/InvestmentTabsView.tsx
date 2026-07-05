import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Minus,
  Pencil,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  FileSpreadsheet,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  FileText,
  X,
  TrendingUp,
  TrendingDown,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PillBadge, type PillTone } from "@/components/ui/pill-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useImports, type Import } from "@/hooks/useImports";
import { useLocalization } from "@/hooks/useLocalization";
import { useMonthlyInvestmentUpload } from "@/hooks/useMonthlyInvestmentUpload";
import { useToast } from "@/hooks/use-toast";

const VALID_EXTS = [".xlsx", ".xls", ".csv", ".pdf"];
const DEFAULT_MONTHS = 6;
const MIN_MONTHS = 6;
const MONTHS_INCREMENT = 1;

/** Investment record as returned by the DB. */
interface Investment {
  id: string;
  user_id: string;
  upload_id: string | null;
  date: string;
  amount: number;
  platform: string;
  asset_type: string | null;
  description: string;
  type: string;
  created_at: string;
  import_id?: string | null;
}

/** Buffered (unsaved) edit on a single investment row. */
export type PendingInvEdit = {
  type?: string;
  asset_type?: string | null;
  platform?: string;
  description?: string;
  amount?: number;
  date?: string;
};

const INVESTMENT_TYPES = [
  { value: "deposit", label: "Deposit", tone: "green" as PillTone, icon: TrendingUp },
  { value: "withdrawal", label: "Withdrawal", tone: "red" as PillTone, icon: TrendingDown },
  { value: "dividend", label: "Dividend", tone: "amber" as PillTone, icon: Coins },
  { value: "fee", label: "Fee", tone: "neutral" as PillTone, icon: Minus },
  { value: "interest", label: "Interest", tone: "amber" as PillTone, icon: Plus },
] as const;

const ASSET_TYPES = [
  "Stock",
  "ETF",
  "Bond",
  "Crypto",
  "Mutual Fund",
  "Index Fund",
  "Real Estate",
  "Commodity",
  "Cash",
  "Other",
] as const;

const getTypeMeta = (t: string) => {
  const found = INVESTMENT_TYPES.find((x) => x.value === t.toLowerCase());
  return found || { value: t, label: t, tone: "neutral" as PillTone, icon: Coins };
};

/* ─────────────────────────  Main component  ───────────────────────── */

export function InvestmentTabsView() {
  const { user } = useAuth();
  const { formatMonth } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting } = useImports("INVESTING");
  const {
    pendingFilesByMonth,
    addFilesForMonth,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
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

  const [activeKey, setActiveKey] = useState<string>(() => monthSlots[0]?.key ?? "");
  useEffect(() => {
    if (!activeKey && monthSlots[0]) setActiveKey(monthSlots[0].key);
  }, [monthSlots, activeKey]);

  const activeSlot = monthSlots.find((s) => s.key === activeKey) ?? monthSlots[0];
  const isProcessingAny = useMemo(
    () => Object.values(pendingFilesByMonth).some((arr) => arr.some((f) => f.status === "processing" || f.status === "pending")),
    [pendingFilesByMonth],
  );

  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesPicked = (files: FileList | null, monthDate: Date) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) =>
      VALID_EXTS.includes("." + (f.name.split(".").pop()?.toLowerCase() || "")),
    );
    if (valid.length) {
      addFilesForMonth(valid, monthDate);
      // Auto-process immediately after adding (mirrors bank flow).
      setTimeout(() => processFilesForMonth(monthDate), 50);
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
      {/* ============= Header ============= */}
      <div className="flex items-center justify-between gap-3 px-6 md:px-10 py-5 md:py-6 border-b border-border bg-card">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
            Investment statements
          </h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            Pick a month and edit movements inline
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
          <Button
            size="sm"
            onClick={() => globalFileInputRef.current?.click()}
            disabled={isProcessingAny}
            className="gap-2 h-9 px-5 font-medium"
            title="Upload a broker statement for the active month"
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
    </div>
  );
}

/* ─────────────────────────  Month tab strip  ───────────────────────── */

interface MonthTabStripProps {
  slots: { key: string; label: string; date: Date }[];
  activeKey: string;
  onActivate: (k: string) => void;
  importsByMonth: Record<string, Import[]>;
  onLoadMore: () => void;
  onShowLess: () => void;
  canShowLess: boolean;
}

function MonthTabStrip({
  slots,
  activeKey,
  onActivate,
  importsByMonth,
  onLoadMore,
  onShowLess,
  canShowLess,
}: MonthTabStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: -1 | 1) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="flex items-stretch border-b border-border bg-primary/5">
        <div
          ref={scrollRef}
          className="flex-1 flex items-stretch overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {slots.map((slot) => {
            const active = slot.key === activeKey;
            const imps = importsByMonth[slot.key] || [];
            const hasData = imps.length > 0;
            const txCount = imps.reduce((sum, i) => sum + (i.transactions_count || 0), 0);
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => onActivate(slot.key)}
                className={cn(
                  "group relative flex items-center gap-2 px-5 py-2.5 text-sm whitespace-nowrap transition-all border-r border-border/40",
                  active
                    ? "bg-card text-foreground font-semibold -mb-px border-b-card z-10"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/10",
                )}
              >
                <span className="capitalize">{slot.label}</span>
                {hasData ? (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
                      active ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary/70",
                    )}
                  >
                    {txCount}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-0.5 px-2 border-l border-border/40">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-7 text-muted-foreground hover:text-foreground hover:bg-card"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll tabs left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-7 text-muted-foreground hover:text-foreground hover:bg-card"
            onClick={() => scrollBy(1)}
            aria-label="Scroll tabs right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {canShowLess && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-card"
              onClick={onShowLess}
              title="Show fewer months"
              aria-label="Show fewer months"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-card"
            onClick={onLoadMore}
            title="Show one older month"
            aria-label="Show one older month"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────  Pending file shape (light)  ─────────────────── */

interface PendingFileInfo {
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "completed" | "error";
}

/* ─────────────────────────  Month workspace  ───────────────────────── */

interface MonthWorkspaceProps {
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

function MonthWorkspace({
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

/* ─────────────────  Uploaded files dropdown (header)  ───────────────── */

interface UploadedFilesDropdownProps {
  imports: Import[];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  pendingImportIds: Set<string>;
}

function UploadedFilesDropdown({
  imports,
  deleteImport,
  isDeleting,
  pendingImportIds,
}: UploadedFilesDropdownProps) {
  const count = imports.length;
  const pendingCount = imports.filter((i) => pendingImportIds.has(i.id)).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={count === 0}
          title="View or delete uploaded files"
          aria-label="Manage uploaded files"
          className={cn(
            "group h-9 gap-2 pl-3 pr-2 font-medium border-2 shadow-sm",
            pendingCount > 0
              ? "border-warning/40 bg-warning/10 text-foreground hover:bg-warning/20 hover:border-warning/60"
              : "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10 hover:border-primary/50",
          )}
        >
          <FileSpreadsheet className={cn("w-4 h-4", pendingCount > 0 ? "text-warning" : "text-primary")} />
          <span className="tabular-nums">Manage files</span>
          <span
            className={cn(
              "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums",
              pendingCount > 0
                ? "bg-warning text-warning-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {count}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-card [&>button]:hidden"
      >
        <UploadedFilesHistoryList
          imports={imports}
          deleteImport={deleteImport}
          isDeleting={isDeleting}
          pendingImportIds={pendingImportIds}
        />
      </SheetContent>
    </Sheet>
  );
}

/* ──────────────  Uploaded files — full history list  ────────────── */

interface UploadedFilesHistoryListProps {
  imports: Import[];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  pendingImportIds: Set<string>;
}

function UploadedFilesHistoryList({
  imports,
  deleteImport,
  isDeleting,
  pendingImportIds,
}: UploadedFilesHistoryListProps) {
  const { formatMonth } = useLocalization();
  const { user } = useAuth();

  const { data: monthsByImport = {} } = useQuery({
    queryKey: ["inv-import-months", user?.id, imports.map((i) => i.id).join(",")],
    enabled: !!user?.id && imports.length > 0,
    queryFn: async () => {
      const ids = imports.map((i) => i.id);
      if (ids.length === 0) return {} as Record<string, string[]>;
      const { data, error } = await supabase
        .from("investments")
        .select("upload_id, date")
        .in("upload_id", ids);
      if (error) throw error;
      const map: Record<string, Set<string>> = {};
      (data || []).forEach((row: { upload_id: string | null; date: string | null }) => {
        if (!row.upload_id || !row.date) return;
        const key = String(row.date).substring(0, 7);
        (map[row.upload_id] ??= new Set()).add(key);
      });
      const out: Record<string, string[]> = {};
      Object.entries(map).forEach(([k, set]) => {
        out[k] = Array.from(set).sort();
      });
      return out;
    },
  });

  const fileTypeLabel = (imp: Import) => {
    const fromName = imp.file_name.split(".").pop()?.toUpperCase();
    if (fromName) return fromName;
    if (imp.file_mime?.includes("pdf")) return "PDF";
    if (imp.file_mime?.includes("sheet") || imp.file_mime?.includes("excel"))
      return "XLSX";
    if (imp.file_mime?.includes("csv")) return "CSV";
    return "FILE";
  };

  const fileSizeLabel = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatUploadedAt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const monthLabel = (key: string | undefined) => {
    if (!key) return "—";
    const [y, m] = key.substring(0, 7).split("-").map(Number);
    if (!y || !m) return "—";
    return formatMonth(new Date(y, m - 1, 1));
  };

  const statusIndicator = (imp: Import) => {
    if (imp.status === "FAILED") {
      return <PillBadge tone="red">Failed</PillBadge>;
    }
    if (imp.status === "PARSED" || imp.status === "UPLOADED") {
      return (
        <PillBadge tone="amber">
          {imp.status === "UPLOADED" ? "Uploading" : "Processing"}
        </PillBadge>
      );
    }
    if (pendingImportIds.has(imp.id)) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium text-warning"
          aria-label="Unsaved changes"
          title="This file has unsaved changes"
        >
          <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
          Unsaved
        </span>
      );
    }
    return (
      <CheckCircle2
        className="w-4 h-4 text-success shrink-0"
        aria-label="Ready"
      />
    );
  };

  const monthsLabel = (imp: Import) => {
    const fromTx = monthsByImport[imp.id];
    const keys =
      fromTx && fromTx.length > 0
        ? fromTx
        : imp.target_month
        ? [imp.target_month.substring(0, 7)]
        : [];
    if (keys.length === 0) return "—";
    return keys.map((k) => monthLabel(k)).join(" · ");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground leading-tight">
            Uploaded files
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            All historical data
          </p>
        </div>
        <div className="flex items-center shrink-0 mt-1">
          <SheetClose
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close panel"
            title="Close"
          >
            <ChevronRight className="w-4 h-4" />
          </SheetClose>
        </div>
      </div>

      {imports.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No files uploaded yet.
        </p>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto divide-y divide-border">
          {imports.map((imp) => (
            <div
              key={imp.id}
              className="group px-6 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="shrink-0 mt-0.5 w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <p
                      className="text-[13px] font-medium text-foreground truncate"
                      title={imp.file_name}
                    >
                      {imp.file_name}
                    </p>
                    {statusIndicator(imp)}
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pr-3 text-[11px] text-muted-foreground">
                  <span className="font-medium tabular-nums">
                    {fileTypeLabel(imp)}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">
                    {fileSizeLabel(imp.file_size)}
                  </span>
                  <span aria-hidden>·</span>
                  <span title="Upload date and time" className="tabular-nums">
                    {formatUploadedAt(imp.uploaded_at)}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="capitalize" title="Months covered by this file">
                    {monthsLabel(imp)}
                  </span>
                  {imp.transactions_count != null &&
                    imp.status === "NORMALIZED" && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">
                          {imp.transactions_count} mov
                        </span>
                      </>
                    )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete file?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove{" "}
                        <strong>{imp.file_name}</strong> and all its
                        movements. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteImport(imp.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Inline editor  ───────────────────────── */

interface InlineInvestmentsEditorProps {
  monthKey: string;
  monthLabel: string;
  imports: Import[];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  onAddMore: () => void;
  isProcessing: boolean;
  pendingFiles?: PendingFileInfo[];
  pendingByInv: Record<string, PendingInvEdit>;
  setPendingByInv: React.Dispatch<React.SetStateAction<Record<string, PendingInvEdit>>>;
}

function InlineInvestmentsEditor({
  monthKey,
  monthLabel,
  imports,
  deleteImport,
  isDeleting,
  onAddMore,
  isProcessing,
  pendingFiles,
  pendingByInv,
  setPendingByInv,
}: InlineInvestmentsEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate } = useLocalization();

  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const setPendingFor = (id: string, patch: PendingInvEdit) => {
    setPendingByInv((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };
  const clearPendingFor = (id: string) => {
    setPendingByInv((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Fetch investments for this month
  const { data: investments = [], isLoading } = useQuery({
    queryKey: ["month-investments-inline", monthKey, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const [year, month] = monthKey.split("-").map(Number);
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0);
      const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []) as Investment[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PendingInvEdit }) => {
      const payload: Record<string, unknown> = {};
      if (patch.type !== undefined) payload.type = patch.type;
      if (patch.asset_type !== undefined) payload.asset_type = patch.asset_type;
      if (patch.platform !== undefined) payload.platform = patch.platform;
      if (patch.description !== undefined) payload.description = patch.description;
      if (patch.amount !== undefined) payload.amount = patch.amount;
      if (patch.date !== undefined) payload.date = patch.date;
      const { error } = await supabase.from("investments").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["month-investments-inline"] });
    },
  });

  const commitRow = async (inv: Investment) => {
    const pending = pendingByInv[inv.id];
    if (!pending) return;
    setSavingIds((s) => new Set(s).add(inv.id));
    try {
      await saveMutation.mutateAsync({ id: inv.id, patch: pending });
      clearPendingFor(inv.id);
      toast({ title: "Saved", description: "Movement updated." });
    } catch (e: any) {
      toast({
        title: "Could not save",
        description: e?.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(inv.id);
        return n;
      });
    }
  };

  const deleteRow = async (inv: Investment) => {
    try {
      const { error } = await supabase.from("investments").delete().eq("id", inv.id);
      if (error) throw error;
      clearPendingFor(inv.id);
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["month-investments-inline"] });
      toast({ title: "Deleted", description: "Movement removed." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Could not delete", variant: "destructive" });
    }
  };

  // Distinct platforms from existing investments to populate the selector
  const knownPlatforms = useMemo(() => {
    const set = new Set<string>();
    investments.forEach((i) => i.platform && set.add(i.platform));
    return Array.from(set).sort();
  }, [investments]);

  const summary = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    investments.forEach((i) => {
      if (i.type === "deposit") deposits += Math.abs(i.amount);
      else if (i.type === "withdrawal") withdrawals += Math.abs(i.amount);
    });
    return { count: investments.length, deposits, withdrawals, net: deposits - withdrawals };
  }, [investments]);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 border-b border-border bg-muted/20 text-sm">
        <div className="inline-flex items-center gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground tabular-nums">
            {summary.count}
          </span>
          <span className="text-muted-foreground">movements</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-success">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">
            {formatCurrency(summary.deposits)}
          </span>
          <span className="text-muted-foreground text-xs">deposits</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-destructive">
          <TrendingDown className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">
            {formatCurrency(summary.withdrawals)}
          </span>
          <span className="text-muted-foreground text-xs">withdrawals</span>
        </div>
        <div className="ml-auto inline-flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddMore} disabled={isProcessing} className="h-8 gap-1.5">
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add file
          </Button>
        </div>
      </div>

      {pendingFiles && pendingFiles.length > 0 && (
        <div className="px-6 py-3 border-b border-border">
          <ProcessingPanel files={pendingFiles} />
        </div>
      )}

      {investments.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          No movements parsed yet for {monthLabel}.
        </div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <Table className="w-full table-fixed [&_th]:border-r [&_th]:border-border/60 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[44px] text-center text-xs uppercase tracking-wide text-muted-foreground/60 font-medium">#</TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Date</TableHead>
                <TableHead className="w-[24%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Description</TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Platform</TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Type</TableHead>
                <TableHead className="w-[14%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Asset</TableHead>
                <TableHead className="w-[14%] text-right text-xs uppercase tracking-wide text-muted-foreground font-medium">Amount</TableHead>
                <TableHead className="w-[88px] text-center text-xs uppercase tracking-wide text-muted-foreground font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv, idx) => {
                const pending = pendingByInv[inv.id];
                const isPending = !!pending;
                const isSaving = savingIds.has(inv.id);
                const type = (pending?.type ?? inv.type) || "deposit";
                const meta = getTypeMeta(type);
                const TypeIcon = meta.icon;
                const platform = pending?.platform ?? inv.platform ?? "";
                const asset = (pending?.asset_type ?? inv.asset_type) || "";
                const description = pending?.description ?? inv.description ?? "";
                const amount = pending?.amount ?? inv.amount;
                const date = pending?.date ?? inv.date;

                return (
                  <TableRow
                    key={inv.id}
                    className={cn(
                      "border-b border-border/40 hover:bg-muted/30 transition-colors",
                      isPending && "bg-warning/10 hover:bg-warning/15",
                    )}
                  >
                    <TableCell className="text-center text-xs text-muted-foreground/60 tabular-nums">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          if (e.target.value === inv.date) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.date;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { date: e.target.value });
                          }
                        }}
                        className="h-7 px-1.5 text-xs bg-transparent border-0 hover:border focus:border focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      <Input
                        value={description}
                        onChange={(e) => {
                          if (e.target.value === (inv.description || "")) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.description;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { description: e.target.value });
                          }
                        }}
                        className="h-7 px-1.5 text-sm bg-transparent border-0 hover:border focus:border focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      <Input
                        list={`platforms-${monthKey}`}
                        value={platform}
                        onChange={(e) => {
                          if (e.target.value === (inv.platform || "")) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.platform;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { platform: e.target.value });
                          }
                        }}
                        className="h-7 px-1.5 text-sm bg-transparent border-0 hover:border focus:border focus-visible:ring-0"
                      />
                      <datalist id={`platforms-${monthKey}`}>
                        {knownPlatforms.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={type}
                        onValueChange={(v) => {
                          if (v === inv.type) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.type;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { type: v });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 px-1.5 border-0 bg-transparent hover:border focus:border focus-visible:ring-0 gap-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            <TypeIcon className="w-3 h-3" />
                            <PillBadge tone={meta.tone}>{meta.label}</PillBadge>
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {INVESTMENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={asset || "__none__"}
                        onValueChange={(v) => {
                          const next = v === "__none__" ? null : v;
                          if (next === (inv.asset_type || null)) {
                            const cur = { ...(pendingByInv[inv.id] || {}) };
                            delete cur.asset_type;
                            if (Object.keys(cur).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: cur }));
                          } else {
                            setPendingFor(inv.id, { asset_type: next });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 px-1.5 text-xs border-0 bg-transparent hover:border focus:border focus-visible:ring-0">
                          <SelectValue placeholder="—">
                            {asset || <span className="text-muted-foreground">—</span>}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {ASSET_TYPES.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      <Input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isNaN(v)) return;
                          if (v === inv.amount) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.amount;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { amount: v });
                          }
                        }}
                        className="h-7 px-1.5 text-sm text-right tabular-nums bg-transparent border-0 hover:border focus:border focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-0.5">
                        {isPending ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-success/15 text-success hover:bg-success/25"
                              onClick={() => commitRow(inv)}
                              disabled={isSaving}
                              title="Save changes"
                            >
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={() => clearPendingFor(inv.id)}
                              disabled={isSaving}
                              title="Discard changes"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Delete movement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete movement?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this investment movement.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteRow(inv)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Processing panel  ───────────────────────── */

function ProcessingPanel({ files }: { files: PendingFileInfo[] }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[0_2px_18px_-8px_rgb(8_8_8_/_0.08)] overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 bg-muted/30 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            Processing your file{files.length > 1 ? "s" : ""}
          </div>
          <div className="text-[11px] text-muted-foreground">
            This usually takes 20–60 seconds. You can keep working in another tab.
          </div>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {files.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{f.name}</span>
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
              {f.status === "processing" ? "Processing…" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
