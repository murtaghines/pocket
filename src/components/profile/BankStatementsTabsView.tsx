import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Minus,
  ArrowRightLeft,
  Pencil,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  FileSpreadsheet,
  Upload,
  ChevronLeft,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  PanelRightOpen,
  Split as SplitIcon,
  History,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
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
import { CategoryIcon } from "@/components/ui/category-icon";
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
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useLocalization } from "@/hooks/useLocalization";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { useToast } from "@/hooks/use-toast";
import { AccountSelectDialog } from "./AccountSelectDialog";
import { RuleEditorDialog } from "./RuleEditorDialog";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  TRANSFER_CATEGORIES,
  getCategoryLabel,
  getMovementLabel,
  normalizeCategory,
} from "@/lib/categoryTranslations";
import type { Database } from "@/integrations/supabase/types";

type MovementType = Database["public"]["Enums"]["movement_type"];

interface MonthTransaction {
  id: string;
  date: string;
  description: string;
  description_norm: string | null;
  amount: number;
  type: string;
  movement: MovementType | null;
  category: string;
  category_id: string | null;
  bank: string | null;
  account_id: string | null;
  is_hidden: boolean;
  import_id: string | null;
}

const VALID_EXTS = [".xlsx", ".xls", ".csv", ".pdf"];
const DEFAULT_MONTHS = 6;
const MONTHS_INCREMENT = 1;
const ROW_THRESHOLD = 50;

/** Fields the user can edit from the inline table — used to build audit diffs. */
const USER_TRACKED_FIELDS = new Set<string>([
  "movement",
  "category",
  "category_id",
  "amount",
  "is_hidden",
]);

const FIELD_LABELS: Record<string, string> = {
  movement: "Movement",
  category: "Category",
  category_id: "Category",
  amount: "Amount",
  is_hidden: "Visibility",
};

/**
 * Walk the audit history (newest → oldest) and reconstruct the *original*
 * pre-edit value for every tracked field. Reverts are skipped — they don't
 * count as user-authored edits — and we only keep the oldest `before` value
 * we encounter for each field, which is by definition the import-time value.
 */
function buildOriginalSnapshot(history: AuditEntry[]): {
  values: Record<string, unknown>;
  fields: string[];
} {
  const values: Record<string, unknown> = {};
  // history comes newest-first; iterate oldest-first so we overwrite with the
  // earliest known `before`, then ignore the field on subsequent (newer) edits.
  const ordered = [...history]
    .filter((h) => h.action !== "revert")
    .reverse();
  for (const entry of ordered) {
    const before = (entry.diff_json?.before || {}) as Record<string, unknown>;
    const fields = entry.diff_json?.fields || [];
    for (const f of fields) {
      if (!USER_TRACKED_FIELDS.has(f)) continue;
      if (!(f in values)) values[f] = before[f] ?? null;
    }
  }
  return { values, fields: Object.keys(values) };
}

interface AuditEntry {
  id: string;
  entity_id: string;
  action: string;
  created_at: string;
  diff_json: {
    fields?: string[];
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
}

const getMovementIcon = (m: MovementType) => {
  switch (m) {
    case "INCOME":
      return <Plus className="w-3 h-3" />;
    case "EXPENSE":
      return <Minus className="w-3 h-3" />;
    case "TRANSFER":
      return <ArrowRightLeft className="w-3 h-3" />;
    default:
      return null;
  }
};
const getMovementTone = (m: MovementType): PillTone => {
  switch (m) {
    case "INCOME":
      return "green";
    case "EXPENSE":
      return "red";
    case "TRANSFER":
      return "amber";
    default:
      return "neutral";
  }
};
const getCategoriesForMovement = (m: MovementType) => {
  switch (m) {
    case "INCOME":
      return INCOME_CATEGORIES;
    case "TRANSFER":
      return TRANSFER_CATEGORIES;
    default:
      return EXPENSE_CATEGORIES;
  }
};

/* ─────────────────────────  Main component  ───────────────────────── */

export function BankStatementsTabsView() {
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
  } = useMonthlyFileUpload();

  const cashAccounts = accounts.filter((a) => a.account_role === "CASH");
  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS);

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

  const handleFilesPicked = (files: FileList | null, monthDate: Date) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) =>
      VALID_EXTS.includes("." + (f.name.split(".").pop()?.toLowerCase() || "")),
    );
    if (valid.length) {
      setPendingFiles(valid);
      setPendingDate(monthDate);
      setAccountDialogOpen(true);
    }
  };

  // Global "Add bank statement" — no forced month, backend distributes.
  const handleGlobalFilesPicked = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) =>
      VALID_EXTS.includes("." + (f.name.split(".").pop()?.toLowerCase() || "")),
    );
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
      {/* ============= Header: title (left) + actions (right) ============= */}
      <div className="flex items-center justify-between gap-3 px-6 md:px-10 py-5 md:py-6 border-b border-border bg-card">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
            Bank statements
          </h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            Pick a month and edit transactions inline
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
              handleGlobalFilesPicked(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            onClick={() => globalFileInputRef.current?.click()}
            disabled={isProcessingAny()}
            className="gap-2 h-9 px-5 font-medium"
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
          setMonthsToShow((n) => Math.max(DEFAULT_MONTHS, n - MONTHS_INCREMENT))
        }
        canShowLess={monthsToShow > DEFAULT_MONTHS}
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
            // Auto-distribution bucket — surface its progress on every month
            // tab so the user always sees the in-flight upload, regardless of
            // which month they're currently inspecting.
            ...(pendingFilesByMonth["__auto__"] || []),
          ]}
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
      {/* Airtable-style tab strip: full-bleed, pastel band, active tab is white and seamless */}
      <div className="flex items-stretch border-b border-border bg-primary/5">
        <div
          ref={scrollRef}
          className="flex-1 flex items-stretch overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {slots.map((slot, idx) => {
            const active = slot.key === activeKey;
            const imports = importsByMonth[slot.key] || [];
            const hasData = imports.length > 0;
            const txCount = imports.reduce(
              (sum, i) => sum + (i.transactions_count || 0),
              0,
            );
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
                      active
                        ? "bg-primary/15 text-primary"
                        : "bg-primary/10 text-primary/70",
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

        {/* Right cluster: scroll arrows + load more, all together */}
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

/* ─────────────────────────  Month workspace  ───────────────────────── */

interface MonthWorkspaceProps {
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
}

function MonthWorkspace({
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
}: MonthWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLocked = imports.some((i) => i.locked);

  // Empty state
  if (imports.length === 0) {
    return (
      <div className="bg-card py-20 px-6 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
          <Upload className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground capitalize">
          {monthLabel} is empty
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Add a bank statement, credit card bill, or expense report to start
          editing this month's transactions directly.
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
      />
    </div>
  );
}

/* ─────────────────────────  File chips bar  ───────────────────────── */

interface FileChipsBarProps {
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  toggleLockImport: (args: { importId: string; locked: boolean }) => void;
  onAddMore: () => void;
  isProcessing: boolean;
  hideAddButton?: boolean;
}

function FileChipsBar({
  imports,
  cashAccounts,
  deleteImport,
  isDeleting,
  toggleLockImport,
  onAddMore,
  isProcessing,
  hideAddButton,
}: FileChipsBarProps) {
  const queryClient = useQueryClient();

  const acctName = (id: string | null) =>
    (id && cashAccounts.find((a) => a.id === id)?.name) || "—";

  const changeAcct = async (importId: string, newId: string) => {
    await supabase.from("imports").update({ account_id: newId }).eq("id", importId);
    await supabase.from("transactions").update({ account_id: newId }).eq("import_id", importId);
    queryClient.invalidateQueries({ queryKey: ["imports"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["month-transactions-inline"] });
  };

  const statusIcon = (s: string) => {
    if (s === "NORMALIZED") return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
    if (s === "PARSED" || s === "UPLOADED")
      return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />;
    if (s === "FAILED") return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
    return <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {imports.map((imp) => (
        <div
          key={imp.id}
          className={cn(
            "group flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-lg border border-border bg-card text-sm",
            imp.locked && "bg-muted/30",
          )}
        >
          {statusIcon(imp.status)}
          <span
            className="font-medium text-foreground truncate max-w-[200px]"
            title={imp.file_name}
          >
            {imp.file_name}
          </span>
          {imp.transactions_count != null && imp.status === "NORMALIZED" && (
            <span className="text-xs text-muted-foreground tabular-nums">
              · {imp.transactions_count}
            </span>
          )}

          {/* Account selector */}
          {cashAccounts.length > 0 && (
            <Select
              value={imp.account_id || ""}
              onValueChange={(v) => changeAcct(imp.id, v)}
              disabled={!!imp.locked}
            >
              <SelectTrigger className="h-6 text-xs border-0 bg-muted/40 hover:bg-muted px-2 gap-1 w-auto min-w-[90px]">
                <span className="truncate text-foreground">
                  {acctName(imp.account_id)}
                </span>
              </SelectTrigger>
              <SelectContent>
                {cashAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-sm">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Locked indicator (read-only — global lock lives in the status bar) */}
          {imp.locked && (
            <span
              className="inline-flex items-center justify-center h-6 w-6 text-muted-foreground"
              title="This file is part of a locked month"
            >
              <Lock className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isDeleting || imp.locked}
                title="Delete file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete file?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <strong>{imp.file_name}</strong> and
                  all its transactions. This action cannot be undone.
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
      ))}

      {/* Add file chip */}
      {!hideAddButton && (
        <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-primary hover:bg-primary/10 border border-dashed border-primary/30"
        onClick={onAddMore}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
        Add file
        </Button>
      )}
    </div>
  );
}

/* ─────────────────────────  Inline editor  ───────────────────────── */

/* ─────────────────  Uploaded files dropdown (header)  ───────────────── */

interface UploadedFilesDropdownProps {
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  toggleLockImport: (args: { importId: string; locked: boolean }) => void;
}

function UploadedFilesDropdown({
  imports,
  cashAccounts,
  deleteImport,
  isDeleting,
  toggleLockImport,
}: UploadedFilesDropdownProps) {
  const count = imports.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={count === 0}
          title="Show uploaded source files"
          className="h-9 gap-2 px-4 font-medium border-border bg-card hover:bg-muted/60"
        >
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <span className="tabular-nums">
            {count} {count === 1 ? "file" : "files"}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-card"
      >
        <UploadedFilesHistoryList
          imports={imports}
          cashAccounts={cashAccounts}
          deleteImport={deleteImport}
          isDeleting={isDeleting}
          toggleLockImport={toggleLockImport}
        />
      </SheetContent>
    </Sheet>
  );
}

/* ──────────────  Uploaded files — full history list  ────────────── */

interface UploadedFilesHistoryListProps {
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  toggleLockImport: (args: { importId: string; locked: boolean }) => void;
}

function UploadedFilesHistoryList({
  imports,
  cashAccounts,
  deleteImport,
  isDeleting,
  toggleLockImport,
}: UploadedFilesHistoryListProps) {
  const { formatMonth } = useLocalization();

  const acctName = (id: string | null) =>
    (id && cashAccounts.find((a) => a.id === id)?.name) || "—";

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

  const statusBadge = (s: string) => {
    const map: Record<string, { tone: PillTone; label: string }> = {
      NORMALIZED: { tone: "green", label: "Ready" },
      PARSED: { tone: "amber", label: "Processing" },
      UPLOADED: { tone: "amber", label: "Uploading" },
      FAILED: { tone: "red", label: "Failed" },
    };
    const cfg = map[s] ?? { tone: "neutral" as PillTone, label: s };
    return (
      <PillBadge tone={cfg.tone}>
        {cfg.label}
      </PillBadge>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground leading-tight">
            Uploaded files
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            All your source files — tables below combine every record
          </p>
        </div>
        <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-semibold tabular-nums shrink-0 mt-1">
          {imports.length}
        </span>
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
              className={cn(
                "group px-6 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors",
                imp.locked && "bg-muted/15",
              )}
            >
              <div className="shrink-0 mt-0.5 w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                {/* Row 1: name + status */}
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-[13px] font-medium text-foreground truncate"
                    title={imp.file_name}
                  >
                    {imp.file_name}
                  </p>
                  {statusBadge(imp.status)}
                  {imp.locked && (
                    <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Row 2: meta — type · size · uploaded · month · account · txns */}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
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
                  <span className="capitalize">
                    {monthLabel(imp.target_month)}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="truncate">{acctName(imp.account_id)}</span>
                  {imp.transactions_count != null &&
                    imp.status === "NORMALIZED" && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">
                          {imp.transactions_count} tx
                        </span>
                      </>
                    )}
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting || imp.locked}
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
                        transactions. This action cannot be undone.
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

interface InlineTransactionsEditorProps {
  monthKey: string;
  monthLabel: string;
  isLocked: boolean;
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  toggleLockImport: (args: { importId: string; locked: boolean }) => void;
  onAddMore: () => void;
  isProcessing: boolean;
}

function InlineTransactionsEditor({
  monthKey,
  monthLabel,
  isLocked,
  imports,
  cashAccounts,
  deleteImport,
  isDeleting,
  toggleLockImport,
  onAddMore,
  isProcessing,
}: InlineTransactionsEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories("CASHFLOW");
  const { accounts } = useAccounts();
  const { formatCurrency, formatDate } = useLocalization();
  const { getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const [expanded, setExpanded] = useState(false);
  // Per-row "saving"/"saved" indicators
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Movement-mismatch confirmation (e.g. positive amount marked as EXPENSE)
  const [movementConfirm, setMovementConfirm] = useState<{
    tx: MonthTransaction;
    newMovement: MovementType;
  } | null>(null);

  // Category change → "save as rule?" prompt
  const [categoryRulePrompt, setCategoryRulePrompt] = useState<{
    tx: MonthTransaction;
    newSlug: string;
    newCategoryId: string | null;
    cleanDesc: string;
    targetMovement: MovementType;
  } | null>(null);

  // Edit-history popover open state (one tx at a time)
  const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null);

  const accountName = (id: string | null) =>
    accounts.find((a) => a.id === id)?.name || null;

  // Fetch transactions for this month
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["month-transactions-inline", monthKey, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const [year, month] = monthKey.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, date, description, description_norm, amount, type, movement, category, category_id, bank, account_id, is_hidden, import_id",
        )
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []) as MonthTransaction[];
    },
    enabled: !!user,
  });

  // Fetch edit history for every tx in this month, grouped by tx id (newest first)
  const { data: auditByTx = {} } = useQuery({
    queryKey: ["tx-audit", monthKey, user?.id],
    queryFn: async () => {
      if (!user || transactions.length === 0) return {};
      const ids = transactions.map((t) => t.id);
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, entity_id, action, created_at, diff_json")
        .eq("user_id", user.id)
        .eq("entity_type", "transaction")
        .in("entity_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const grouped: Record<string, AuditEntry[]> = {};
      for (const row of (data || []) as AuditEntry[]) {
        (grouped[row.entity_id] ||= []).push(row);
      }
      return grouped;
    },
    enabled: !!user && transactions.length > 0,
  });

  // Single auto-save mutation: applies any partial update to a transaction
  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
      before,
    }: {
      id: string;
      payload: Record<string, unknown>;
      before?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from("transactions").update(payload).eq("id", id);
      if (error) throw error;

      // Audit log: record what changed so the user can review/revert later.
      // We only log fields the user actually edited, with before/after snapshots.
      if (user?.id && before) {
        const fields: string[] = [];
        const beforeDiff: Record<string, unknown> = {};
        const afterDiff: Record<string, unknown> = {};
        for (const key of Object.keys(payload)) {
          // Only persist user-meaningful fields
          if (!USER_TRACKED_FIELDS.has(key)) continue;
          const prev = before[key] ?? null;
          const next = payload[key] ?? null;
          if (prev === next) continue;
          fields.push(key);
          beforeDiff[key] = prev;
          afterDiff[key] = next;
        }
        if (fields.length > 0) {
          await supabase.from("audit_log").insert([
            {
              user_id: user.id,
              entity_type: "transaction",
              entity_id: id,
              action: (payload as { __action?: string }).__action ?? "edit",
              diff_json: { fields, before: beforeDiff, after: afterDiff } as never,
            },
          ]);
        }
      }
      return id;
    },
    onMutate: ({ id }) => {
      setSavingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: (id) => {
      setSavingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      setSavedIds((prev) => new Set(prev).add(id));
      // Clear "saved" badge after 1.2s
      setTimeout(() => {
        setSavedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }, 1200);
      queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tx-audit", monthKey, user?.id] });
    },
    onError: (err: any, vars) => {
      setSavingIds((prev) => {
        const n = new Set(prev);
        n.delete(vars.id);
        return n;
      });
      toast({
        title: "Couldn't save change",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handlers (auto-save on change)
  const applyMovementChange = (tx: MonthTransaction, newMovement: MovementType) => {
    const defaultCat = getCategoriesForMovement(newMovement)[0];
    const cat = categories.find((c) => c.slug === defaultCat);
    saveMutation.mutate({
      id: tx.id,
      payload: {
        movement: newMovement,
        category: defaultCat,
        category_id: cat?.id || null,
        category_source: "MANUAL",
        categorized_by: "user",
        user_corrected: true,
      },
      before: {
        movement: tx.movement,
        category: tx.category,
        category_id: tx.category_id,
      },
    });
  };

  const handleMovementChange = (tx: MonthTransaction, newMovement: MovementType) => {
    if (newMovement === tx.movement) return;
    // Verification only: warn if movement contradicts the amount sign.
    // (positive amount → EXPENSE, or negative amount → INCOME).
    const amount = tx.amount;
    const looksWrong =
      (amount > 0 && newMovement === "EXPENSE") ||
      (amount < 0 && newMovement === "INCOME");
    if (looksWrong) {
      setMovementConfirm({ tx, newMovement });
      return;
    }
    applyMovementChange(tx, newMovement);
  };

  const applyCategoryChange = (
    tx: MonthTransaction,
    newSlug: string,
    categoryId: string | null,
  ) => {
    saveMutation.mutate({
      id: tx.id,
      payload: {
        category: newSlug,
        category_id: categoryId,
        category_source: "MANUAL",
        categorized_by: "user",
        user_corrected: true,
      },
      before: {
        category: tx.category,
        category_id: tx.category_id,
      },
    });
  };

  const handleCategoryChange = (tx: MonthTransaction, newSlug: string) => {
    if (normalizeCategory(tx.category) === newSlug) return;
    const cat = categories.find((c) => c.slug === newSlug);
    const categoryId = cat?.id || null;
    // Apply the change immediately so the UI feels responsive…
    applyCategoryChange(tx, newSlug, categoryId);
    // …and ask whether to turn it into a permanent rule.
    const cleanDesc = (tx.description_norm || tx.description || "")
      .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
      .trim();
    if (!cleanDesc || !categoryId) return;
    const targetMovement = (tx.movement || "EXPENSE") as MovementType;
    setCategoryRulePrompt({
      tx,
      newSlug,
      newCategoryId: categoryId,
      cleanDesc,
      targetMovement,
    });
  };

  const handleAmountChange = (tx: MonthTransaction, raw: string) => {
    const sanitized = raw.replace(/\s/g, "").replace(",", ".");
    let parsed: number;
    if (/^-?[\d.]+$/.test(sanitized)) {
      parsed = parseFloat(sanitized);
    } else if (/^-?[\d+\-*/.()]+$/.test(sanitized)) {
      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized});`)();
        parsed = typeof result === "number" && isFinite(result) ? result : NaN;
      } catch {
        return;
      }
    } else {
      return;
    }
    if (isNaN(parsed)) return;
    const movement = tx.movement || "EXPENSE";
    const sign = movement === "EXPENSE" ? -1 : 1;
    const newAmount = sign * Math.abs(parsed);
    if (newAmount === tx.amount) return;
    saveMutation.mutate({
      id: tx.id,
      payload: { amount: newAmount },
      before: { amount: tx.amount },
    });
  };

  const handleSplit = (tx: MonthTransaction, n: number) => {
    if (n < 1) return;
    const newAmount = Math.sign(tx.amount || 1) * (Math.abs(tx.amount) / n);
    if (newAmount === tx.amount) return;
    saveMutation.mutate({
      id: tx.id,
      payload: { amount: newAmount },
      before: { amount: tx.amount },
    });
  };

  const handleToggleHidden = (tx: MonthTransaction) => {
    saveMutation.mutate({
      id: tx.id,
      payload: { is_hidden: !tx.is_hidden },
      before: { is_hidden: tx.is_hidden },
    });
  };

  // Mismatch detection (sign vs movement)
  const mismatchedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of transactions) {
      if (tx.amount > 0 && tx.movement === "EXPENSE") ids.add(tx.id);
      else if (tx.amount < 0 && tx.movement === "INCOME") ids.add(tx.id);
    }
    return ids;
  }, [transactions]);

  // Summary
  const summary = useMemo(() => {
    const visible = transactions.filter((t) => !t.is_hidden);
    const income = visible
      .filter((t) => t.movement === "INCOME")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = visible
      .filter((t) => t.movement === "EXPENSE")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const transfers = visible.filter((t) => t.movement === "TRANSFER").length;
    const hidden = transactions.filter((t) => t.is_hidden).length;
    return { income, expenses, transfers, hidden, total: transactions.length };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="bg-card py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-card py-12 px-6 text-center">
        <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          File uploaded but no transactions detected yet. They will appear here
          once processing finishes.
        </p>
      </div>
    );
  }

  // All rows always render — hidden ones are visually muted but still listed
  // so the user can clearly see what was excluded from dashboard calculations.
  const visibleAll = transactions;
  const showCollapsedHint = !expanded && visibleAll.length > ROW_THRESHOLD;
  const rowsToRender = showCollapsedHint ? visibleAll.slice(0, ROW_THRESHOLD) : visibleAll;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Mismatch warning */}
      {mismatchedIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-300 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <strong>{mismatchedIds.size}</strong>
          {mismatchedIds.size === 1
            ? " transaction has a sign-movement mismatch."
            : " transactions have sign-movement mismatches."}
          {" "}Review the highlighted rows.
        </div>
      )}

      {/* The spreadsheet — flush, no padding, no inner card */}
      <div className="bg-card flex-1 flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <Table className="w-full table-fixed [&_th]:border-r [&_th]:border-border/60 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[44px] text-center text-xs uppercase tracking-wide text-muted-foreground/60 font-medium">
                  #
                </TableHead>
                <TableHead className="w-[8%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Date
                </TableHead>
                <TableHead className="w-[28%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Description
                </TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Account
                </TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Movement
                </TableHead>
                <TableHead className="w-[16%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Category
                </TableHead>
                <TableHead className="w-[14%] text-right text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Amount
                </TableHead>
                <TableHead className="w-[6%] text-center text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Edit
                </TableHead>
                <TableHead className="w-[6%] text-center text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Show
                </TableHead>
                <TableHead className="w-[6%] text-center text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Revert
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsToRender.map((tx, idx) => {
                const isMismatch = mismatchedIds.has(tx.id);
                const isSaving = savingIds.has(tx.id);
                const isSaved = savedIds.has(tx.id);
                const isHidden = tx.is_hidden;
                const txHistory = auditByTx[tx.id] || [];
                const editEntries = txHistory.filter((h) => h.action !== "revert");
                const isEdited = editEntries.length > 0;
                const originalSnapshot = isEdited ? buildOriginalSnapshot(txHistory) : null;
                const cleanDescription = (tx.description_norm || tx.description)
                  .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
                  .trim();
                const movement = tx.movement || "EXPENSE";
                const category = normalizeCategory(tx.category || "other_expense");
                const availableCategories = getCategoriesForMovement(movement);

                return (
                  <TableRow
                    key={tx.id}
                    className={cn(
                      "transition-colors",
                      isMismatch && "bg-amber-50/60 dark:bg-amber-950/20 border-l-2 border-l-amber-400",
                      isEdited && !isMismatch && "bg-primary/[0.04] border-l-2 border-l-primary/60",
                      isHidden && "opacity-50 bg-muted/20",
                      isSaved && !isMismatch && "bg-success/5",
                    )}
                  >
                    <TableCell className="text-center text-xs text-muted-foreground/70 font-normal tabular-nums">
                      <RowEditIndicator
                        index={idx + 1}
                        history={auditByTx[tx.id] || []}
                        open={openHistoryFor === tx.id}
                        onOpenChange={(o) => setOpenHistoryFor(o ? tx.id : null)}
                        onRevert={(entry) => {
                          if (!entry.diff_json?.before) return;
                          const before = entry.diff_json.before as Record<string, unknown>;
                          const after = (entry.diff_json.after || {}) as Record<string, unknown>;
                          // Restore the previous values; mark this as a revert action in audit.
                          saveMutation.mutate({
                            id: tx.id,
                            payload: { ...before, __action: "revert" },
                            before: after,
                          });
                        }}
                        formatCurrency={formatCurrency}
                        getCategoryLabel={getCategoryLabel}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-foreground tabular-nums">
                      {formatDate(new Date(tx.date))}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-start gap-2 min-w-0">
                        <span
                          className={cn(
                            "break-words flex-1 text-foreground",
                            isHidden && "line-through",
                          )}
                          title={cleanDescription}
                        >
                          {cleanDescription}
                        </span>
                        {isSaving && (
                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        {isSaved && !isSaving && (
                          <Check className="w-3 h-3 text-success shrink-0 mt-0.5" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {accountName(tx.account_id) || tx.bank || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isLocked ? (
                        <PillBadge variant="solid" tone={getMovementTone(movement)} icon={getMovementIcon(movement)}>
                          {getMovementLabel(movement)}
                        </PillBadge>
                      ) : (
                        <Select
                          value={movement}
                          onValueChange={(v) => handleMovementChange(tx, v as MovementType)}
                          disabled={isHidden}
                        >
                          <SelectTrigger className="h-8 text-sm border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-ring/40 px-1.5 [&>svg]:opacity-50 min-w-[110px]">
                            <SelectValue>
                              <PillBadge variant="solid" tone={getMovementTone(movement)} icon={getMovementIcon(movement)}>
                                {getMovementLabel(movement)}
                              </PillBadge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INCOME">
                              <PillBadge variant="solid" tone="green" icon={<Plus className="w-3 h-3" />}>
                                {getMovementLabel("INCOME")}
                              </PillBadge>
                            </SelectItem>
                            <SelectItem value="EXPENSE">
                              <PillBadge variant="solid" tone="red" icon={<Minus className="w-3 h-3" />}>
                                {getMovementLabel("EXPENSE")}
                              </PillBadge>
                            </SelectItem>
                            <SelectItem value="TRANSFER">
                              <PillBadge variant="solid" tone="amber" icon={<ArrowRightLeft className="w-3 h-3" />}>
                                {getMovementLabel("TRANSFER")}
                              </PillBadge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isLocked ? (
                        <PillBadge colorVar={getCategoryColor(category)} className="text-[13px]">
                          <CategoryIcon
                            iconName={getCategoryIcon(category)}
                            colorVar={getCategoryColor(category)}
                            size="sm"
                            showBackground={false}
                          />
                          <span className="truncate max-w-[140px]" title={getCategoryLabel(category)}>
                            {getCategoryLabel(category)}
                          </span>
                        </PillBadge>
                      ) : (
                        <Select
                          value={category}
                          onValueChange={(v) => handleCategoryChange(tx, v)}
                          disabled={isHidden}
                        >
                          <SelectTrigger className="h-8 text-sm border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-ring/40 px-1.5 [&>svg]:opacity-50">
                            <SelectValue>
                              <PillBadge colorVar={getCategoryColor(category)} className="text-[13px]">
                                <CategoryIcon
                                  iconName={getCategoryIcon(category)}
                                  colorVar={getCategoryColor(category)}
                                  size="sm"
                                  showBackground={false}
                                />
                                <span className="truncate max-w-[140px]" title={getCategoryLabel(category)}>
                                  {getCategoryLabel(category)}
                                </span>
                              </PillBadge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map((slug) => (
                              <SelectItem key={slug} value={slug}>
                                <div className="flex items-center gap-2">
                                  <CategoryIcon
                                    iconName={getCategoryIcon(slug)}
                                    colorVar={getCategoryColor(slug)}
                                    size="sm"
                                    showBackground
                                  />
                                  {getCategoryLabel(slug)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium text-foreground">
                      {tx.amount < 0 ? "-" : ""}
                      {formatCurrency(Math.abs(tx.amount))}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isLocked && (
                        <AmountEditButton
                          originalAmount={tx.amount}
                          formatCurrency={formatCurrency}
                          onChangeAmount={(v) => handleAmountChange(tx, v)}
                          onApplySplit={(n) => handleSplit(tx, n)}
                          disabled={isHidden}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isLocked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground/60 hover:text-foreground"
                          onClick={() => handleToggleHidden(tx)}
                          title={isHidden ? "Include in totals" : "Hide from totals"}
                        >
                          {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isLocked && isEdited && originalSnapshot && (
                        <RevertToOriginalButton
                          original={originalSnapshot.values}
                          fields={originalSnapshot.fields}
                          current={{
                            movement: tx.movement,
                            category: tx.category,
                            category_id: tx.category_id,
                            amount: tx.amount,
                            is_hidden: tx.is_hidden,
                          }}
                          formatCurrency={formatCurrency}
                          getCategoryLabel={getCategoryLabel}
                          onConfirm={() => {
                            const payload: Record<string, unknown> = {
                              ...originalSnapshot.values,
                              __action: "revert",
                            };
                            // If we're restoring category, also clear the manual override flags
                            if ("category" in originalSnapshot.values) {
                              payload.category_source = "DEFAULT";
                              payload.user_corrected = false;
                            }
                            saveMutation.mutate({
                              id: tx.id,
                              payload,
                              before: {
                                movement: tx.movement,
                                category: tx.category,
                                category_id: tx.category_id,
                                amount: tx.amount,
                                is_hidden: tx.is_hidden,
                              },
                            });
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Collapsed-rows hint */}
        {showCollapsedHint && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border bg-muted/30 text-sm">
            <span className="text-muted-foreground">
              Showing first <strong className="text-foreground">{ROW_THRESHOLD}</strong> of{" "}
              <strong className="text-foreground">{visibleAll.length}</strong> rows
            </span>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setExpanded(true)}>
              <ChevronDown className="w-4 h-4" />
              Show all
            </Button>
          </div>
        )}
        {expanded && visibleAll.length > ROW_THRESHOLD && (
          <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-border bg-muted/30 text-sm">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setExpanded(false)}>
              <ChevronUp className="w-4 h-4" />
              Collapse
            </Button>
          </div>
        )}

        {/* White canvas fills the rest of the screen — pushes footer down */}
        <div className="bg-card flex-1" />

        {/* Spreadsheet footer: totals (Excel status-bar style) — sticks to the bottom */}
        <div className="border-t border-border bg-card px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
          <div className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">{summary.total}</span>
            row{summary.total !== 1 ? "s" : ""}
          </div>
          <span className="text-border">|</span>
          <div className="inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-success" />
            <span className="text-success font-semibold tabular-nums">
              {formatCurrency(summary.income)}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Minus className="w-3.5 h-3.5 text-destructive" />
            <span className="text-destructive font-semibold tabular-nums">
              {formatCurrency(summary.expenses)}
            </span>
          </div>
          {summary.transfers > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-warning" />
              <span className="text-warning font-semibold tabular-nums">
                {summary.transfers} transfer{summary.transfers !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {summary.hidden > 0 && (
            <div className="inline-flex items-center gap-1.5 text-muted-foreground">
              <EyeOff className="w-3.5 h-3.5" />
              <span className="tabular-nums">
                {summary.hidden} hidden
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                · excluded from dashboard
              </span>
            </div>
          )}
          <div className="ml-auto inline-flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Changes auto-save
            </span>
            <button
              type="button"
              onClick={() => {
                // Toggle lock on every file of the month at once
                const nextLocked = !isLocked;
                imports.forEach((imp) => {
                  if (!!imp.locked !== nextLocked) {
                    toggleLockImport({ importId: imp.id, locked: nextLocked });
                  }
                });
                toast({
                  title: nextLocked ? "Month locked" : "Month unlocked",
                  description: nextLocked
                    ? "Editing is disabled until you unlock it."
                    : "You can edit transactions again.",
                });
              }}
              disabled={imports.length === 0}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors",
                isLocked
                  ? "bg-foreground/90 text-background hover:bg-foreground"
                  : "bg-muted text-foreground/80 hover:bg-muted/70",
                imports.length === 0 && "opacity-50 cursor-not-allowed",
              )}
              title={isLocked ? "Unlock month — allow editing" : "Lock month — prevent edits"}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  Lock month
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Movement mismatch verification (no rule, just confirm) */}
      <AlertDialog
        open={!!movementConfirm}
        onOpenChange={(o) => !o && setMovementConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 ring-1 ring-warning/20 mb-1">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <AlertDialogTitle>Sign and movement don't match</AlertDialogTitle>
            <AlertDialogDescription>
              {movementConfirm && (
                <span className="block space-y-3">
                  <span className="block">
                    The amount is{" "}
                    <span className="font-semibold text-foreground">
                      {movementConfirm.tx.amount < 0 ? "negative" : "positive"}
                    </span>
                    , but you're marking this as{" "}
                    <span className="font-semibold text-foreground">
                      {getMovementLabel(movementConfirm.newMovement)}
                    </span>
                    .
                  </span>
                  <span className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs">
                    <span className="uppercase tracking-wide text-muted-foreground/80 font-medium">
                      Amount
                    </span>
                    <span
                      className={cn(
                        "tabular-nums font-semibold text-sm",
                        movementConfirm.tx.amount < 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {movementConfirm.tx.amount < 0 ? "−" : "+"}
                      {formatCurrency(Math.abs(movementConfirm.tx.amount))}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Usually{" "}
                    {movementConfirm.newMovement === "INCOME"
                      ? "income is positive (money in)"
                      : "expenses are negative (money out)"}
                    . You can save it anyway if it's correct.
                  </span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (movementConfirm) {
                  applyMovementChange(movementConfirm.tx, movementConfirm.newMovement);
                }
                setMovementConfirm(null);
              }}
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category change → optional "save as rule" */}
      <RuleEditorDialog
        open={!!categoryRulePrompt}
        onOpenChange={(o) => !o && setCategoryRulePrompt(null)}
        description={categoryRulePrompt?.cleanDesc ?? ""}
        movement={categoryRulePrompt?.targetMovement ?? "EXPENSE"}
        categorySlug={categoryRulePrompt?.newSlug ?? ""}
        categoryLabel={
          categoryRulePrompt ? getCategoryLabel(categoryRulePrompt.newSlug) : ""
        }
        categoryColorVar={
          categoryRulePrompt ? getCategoryColor(categoryRulePrompt.newSlug) : undefined
        }
        categoryIcon={
          categoryRulePrompt ? getCategoryIcon(categoryRulePrompt.newSlug) : undefined
        }
        onSkip={() => setCategoryRulePrompt(null)}
        skipLabel="Just this one"
        onConfirm={async (payload) => {
          if (!user) {
            setCategoryRulePrompt(null);
            return;
          }
          const { error } = await supabase.from("user_rules").insert({
            user_id: user.id,
            source: "user_correction",
            match_type: payload.match_type,
            pattern: payload.pattern,
            tokens: payload.tokens,
            movement: payload.movement,
            category: payload.category,
            confidence: 0.99,
            original_description: payload.original_description,
            is_active: true,
          });
          if (error) {
            toast({
              title: "Couldn't save rule",
              description: error.message,
              variant: "destructive",
            });
          } else {
            toast({
              title: "✓ Rule saved",
              description: `Future transactions matching “${payload.pattern.slice(0, 40)}${payload.pattern.length > 40 ? "…" : ""}” will be categorized as ${getCategoryLabel(payload.category)}.`,
            });
            queryClient.invalidateQueries({ queryKey: ["user_rules"] });
            queryClient.invalidateQueries({ queryKey: ["categorization_rules"] });
          }
          setCategoryRulePrompt(null);
        }}
      />
    </div>
  );
}

/* ─────────────────────────  Amount edit popover  ───────────────────────── */

interface AmountEditButtonProps {
  originalAmount: number;
  formatCurrency: (n: number) => string;
  onChangeAmount: (raw: string) => void;
  onApplySplit: (n: number) => void;
  disabled?: boolean;
}

function AmountEditButton({
  originalAmount,
  formatCurrency,
  onChangeAmount,
  onApplySplit,
  disabled,
}: AmountEditButtonProps) {
  const [open, setOpen] = useState(false);
  const [splitN, setSplitN] = useState(2);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Split between people"
        >
          <SplitIcon className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <SplitIcon className="w-3 h-3" />
              Split between N people
            </label>
            <Input
              type="number"
              min={1}
              step={1}
              value={splitN}
              onChange={(e) => setSplitN(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-8 mt-1"
            />
            <div className="text-xs text-muted-foreground mt-2">
              Original: <span className="tabular-nums">{formatCurrency(Math.abs(originalAmount))}</span>
            </div>
            <div className="text-sm font-medium">
              Your share:{" "}
              <span className="tabular-nums">
                {formatCurrency(Math.abs(originalAmount) / splitN)}
              </span>
            </div>
            <Button
              size="sm"
              className="w-full h-8 mt-2"
              onClick={() => {
                onApplySplit(splitN);
                setOpen(false);
              }}
            >
              Apply ÷ {splitN}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────────  Row edit history indicator  ───────────────────────── */

interface RowEditIndicatorProps {
  index: number;
  history: AuditEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevert: (entry: AuditEntry) => void;
  formatCurrency: (n: number) => string;
  getCategoryLabel: (slug: string) => string;
}

function formatAuditValue(
  field: string,
  value: unknown,
  formatCurrency: (n: number) => string,
  getCategoryLabel: (slug: string) => string,
): string {
  if (value === null || value === undefined) return "—";
  if (field === "amount" && typeof value === "number") return formatCurrency(value);
  if ((field === "category" || field === "category_id") && typeof value === "string") {
    return getCategoryLabel(value) || value;
  }
  if (field === "movement" && typeof value === "string") return getMovementLabel(value as MovementType);
  if (field === "is_hidden") return value ? "Hidden" : "Visible";
  return String(value);
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function RowEditIndicator({
  index,
  history,
  open,
  onOpenChange,
  onRevert,
  formatCurrency,
  getCategoryLabel,
}: RowEditIndicatorProps) {
  // Filter out reverts from the visible list to keep things tidy, but use the
  // full history to know if the row has any changes worth showing.
  const editEntries = history.filter((h) => h.action !== "revert");

  if (editEntries.length === 0) {
    return <span>{index}</span>;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center justify-center w-6 h-6 mx-auto rounded-full hover:bg-primary/10 transition-colors"
          title={`${editEntries.length} change${editEntries.length === 1 ? "" : "s"} — click to review`}
        >
          <span className="relative inline-flex w-2 h-2 rounded-full bg-primary" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-[360px] p-0 max-h-[420px] overflow-hidden flex flex-col"
      >
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/40">
          <History className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Edit history
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {editEntries.length} change{editEntries.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-border">
          {editEntries.map((entry) => {
            const fields = entry.diff_json?.fields || [];
            const before = (entry.diff_json?.before || {}) as Record<string, unknown>;
            const after = (entry.diff_json?.after || {}) as Record<string, unknown>;
            // Dedupe overlapping field labels (category + category_id → "Category")
            const seenLabels = new Set<string>();
            const uniqueFields = fields.filter((f) => {
              const label = FIELD_LABELS[f] || f;
              if (seenLabels.has(label)) return false;
              seenLabels.add(label);
              return true;
            });
            return (
              <div key={entry.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                    {formatRelativeTime(entry.created_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRevert(entry)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    title="Restore the values from before this change"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Undo
                  </button>
                </div>
                <div className="space-y-1">
                  {uniqueFields.map((f) => (
                    <div
                      key={f}
                      className="text-xs text-foreground flex items-baseline gap-1.5 flex-wrap"
                    >
                      <span className="text-muted-foreground">
                        {FIELD_LABELS[f] || f}:
                      </span>
                      <span className="line-through text-muted-foreground/70">
                        {formatAuditValue(f, before[f], formatCurrency, getCategoryLabel)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium text-foreground">
                        {formatAuditValue(f, after[f], formatCurrency, getCategoryLabel)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <p className="text-[11px] text-muted-foreground">
            All edits are tracked. Use Undo to restore the previous value.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────  Revert-to-original button (per row)  ───────────────────── */

interface RevertToOriginalButtonProps {
  original: Record<string, unknown>;
  fields: string[];
  current: Record<string, unknown>;
  formatCurrency: (n: number) => string;
  getCategoryLabel: (slug: string) => string;
  onConfirm: () => void;
}

function RevertToOriginalButton({
  original,
  fields,
  current,
  formatCurrency,
  getCategoryLabel,
  onConfirm,
}: RevertToOriginalButtonProps) {
  // Hide overlapping field labels (category + category_id collapse to "Category")
  const seen = new Set<string>();
  const uniqueFields = fields.filter((f) => {
    const label = FIELD_LABELS[f] || f;
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
          title="Restore this row to its original imported values"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            Restore original values?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will discard all your manual edits and bring this transaction
                back to the values it had when it was first imported.
              </p>
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                {uniqueFields.map((f) => (
                  <div
                    key={f}
                    className="text-xs text-foreground flex items-baseline gap-1.5 flex-wrap"
                  >
                    <span className="text-muted-foreground font-medium">
                      {FIELD_LABELS[f] || f}:
                    </span>
                    <span className="line-through text-muted-foreground/70">
                      {formatAuditValue(f, current[f], formatCurrency, getCategoryLabel)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary">
                      {formatAuditValue(f, original[f], formatCurrency, getCategoryLabel)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                You can still review the full edit history afterwards from the row indicator.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Restore original
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}