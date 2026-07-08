import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  ChevronRight,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileText,
  Sheet as SheetIcon,
  FileType,
  File as FileIcon,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { PillBadge } from "@/components/ui/pill-badge";
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
import { useAccounts } from "@/hooks/useAccounts";
import { useLocalization } from "@/hooks/useLocalization";
import type { Import } from "@/hooks/useImports";

export interface UploadedFilesDropdownProps {
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  toggleLockImport: (args: { importId: string; locked: boolean }) => void;
  pendingImportIds: Set<string>;
  retryImport?: (importId: string, fileStorageUrl: string | null, fileName: string, accountId: string | null) => void;
  retryingImportIds?: Set<string>;
}

export function UploadedFilesDropdown({
  imports,
  cashAccounts,
  deleteImport,
  isDeleting,
  toggleLockImport,
  pendingImportIds,
  retryImport,
  retryingImportIds,
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
          title="View, edit account or delete uploaded files"
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
          cashAccounts={cashAccounts}
          deleteImport={deleteImport}
          isDeleting={isDeleting}
          toggleLockImport={toggleLockImport}
          pendingImportIds={pendingImportIds}
          retryImport={retryImport}
          retryingImportIds={retryingImportIds}
        />
      </SheetContent>
    </Sheet>
  );
}

/* ──────────────  Uploaded files — full history list  ────────────── */

export interface UploadedFilesHistoryListProps {
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  toggleLockImport: (args: { importId: string; locked: boolean }) => void;
  pendingImportIds: Set<string>;
  retryImport?: (importId: string, fileStorageUrl: string | null, fileName: string, accountId: string | null) => void;
  retryingImportIds?: Set<string>;
}

export function UploadedFilesHistoryList({
  imports,
  cashAccounts,
  deleteImport,
  isDeleting,
  toggleLockImport,
  pendingImportIds,
  retryImport,
  retryingImportIds,
}: UploadedFilesHistoryListProps) {
  const { formatMonth } = useLocalization();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all distinct months covered by transactions of each import.
  // Some files (e.g. multi-month statements) span more than `target_month`.
  const { data: monthsByImport = {} } = useQuery({
    queryKey: ["import-months", user?.id, imports.map((i) => i.id).join(",")],
    enabled: !!user?.id && imports.length > 0,
    queryFn: async () => {
      const ids = imports.map((i) => i.id);
      if (ids.length === 0) return {} as Record<string, string[]>;
      const { data, error } = await supabase
        .from("transactions")
        .select("import_id, date")
        .in("import_id", ids);
      if (error) throw error;
      const map: Record<string, Set<string>> = {};
      (data || []).forEach((row: any) => {
        if (!row.import_id || !row.date) return;
        const key = String(row.date).substring(0, 7);
        (map[row.import_id] ??= new Set()).add(key);
      });
      const out: Record<string, string[]> = {};
      Object.entries(map).forEach(([k, set]) => {
        out[k] = Array.from(set).sort();
      });
      return out;
    },
  });

  // Detect rows where amount sign and movement disagree (e.g. positive
  // amount marked as EXPENSE) — surfaces as a warning icon per file.
  const { data: mismatchByImport = {} } = useQuery({
    queryKey: ["import-mismatch", user?.id, imports.map((i) => i.id).join(",")],
    enabled: !!user?.id && imports.length > 0,
    queryFn: async () => {
      const ids = imports.map((i) => i.id);
      if (ids.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("transactions")
        .select("import_id, amount, movement")
        .in("import_id", ids);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (!row.import_id) return;
        const wrong =
          (row.amount > 0 && row.movement === "EXPENSE") ||
          (row.amount < 0 && row.movement === "INCOME");
        if (wrong) counts[row.import_id] = (counts[row.import_id] || 0) + 1;
      });
      return counts;
    },
  });

  const acctName = (id: string | null) =>
    (id && cashAccounts.find((a) => a.id === id)?.name) || "—";

  const changeAcct = async (importId: string, newId: string) => {
    await supabase.from("imports").update({ account_id: newId }).eq("id", importId);
    await supabase.from("transactions").update({ account_id: newId }).eq("import_id", importId);
    queryClient.invalidateQueries({ queryKey: ["imports"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["month-transactions-inline"] });
  };

  const fileTypeLabel = (imp: Import) => {
    const fromName = imp.file_name.split(".").pop()?.toUpperCase();
    if (fromName) return fromName;
    if (imp.file_mime?.includes("pdf")) return "PDF";
    if (imp.file_mime?.includes("sheet") || imp.file_mime?.includes("excel"))
      return "XLSX";
    if (imp.file_mime?.includes("csv")) return "CSV";
    return "FILE";
  };

  // Icon + tint per file type — keeps the listing scannable at a glance.
  const fileTypeVisual = (imp: Import) => {
    const ext = (imp.file_name.split(".").pop() || "").toLowerCase();
    const mime = imp.file_mime || "";
    const tint = "bg-primary/10 text-primary";
    if (ext === "pdf" || mime.includes("pdf")) {
      return { Icon: FileText, tint };
    }
    if (
      ext === "xlsx" ||
      ext === "xls" ||
      mime.includes("sheet") ||
      mime.includes("excel")
    ) {
      return { Icon: FileSpreadsheet, tint };
    }
    if (ext === "csv" || mime.includes("csv")) {
      return { Icon: SheetIcon, tint };
    }
    if (ext === "txt" || mime.includes("text/plain")) {
      return { Icon: FileType, tint };
    }
    return { Icon: FileIcon, tint };
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

  // Subtle status indicator. Order of priority (highest first):
  //   FAILED  → red badge
  //   PARTIAL → amber badge (some rows landed, some didn't — distinct from a clean NORMALIZED)
  //   PARSED / UPLOADED → amber "processing" badge
  //   has unsaved (pending) edits → amber dot
  //   has mismatched rows → amber warning icon
  //   locked → lock icon
  //   ready → green check
  const statusIndicator = (imp: Import) => {
    if (imp.status === "FAILED") {
      return <PillBadge tone="red">Failed</PillBadge>;
    }
    if (imp.status === "PARTIAL") {
      return (
        <PillBadge tone="amber" title={imp.error_message || undefined}>
          Partial
        </PillBadge>
      );
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
    const mismatchCount = mismatchByImport[imp.id] || 0;
    if (mismatchCount > 0) {
      return (
        <AlertTriangle
          className="w-4 h-4 text-warning shrink-0"
          aria-label={`${mismatchCount} row(s) need review`}
        >
          <title>{`${mismatchCount} row(s) need review`}</title>
        </AlertTriangle>
      );
    }
    if (imp.locked) {
      return (
        <Lock
          className="w-3.5 h-3.5 text-muted-foreground shrink-0"
          aria-label="Locked"
        />
      );
    }
    return (
      <CheckCircle2
        className="w-4 h-4 text-success shrink-0"
        aria-label="Ready"
      />
    );
  };

  // Render every month covered by the import. When transactions span more
  // than one month, list them all so the user understands what's inside.
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
              className={cn(
                "group px-6 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors",
                imp.locked && "bg-muted/15",
              )}
            >
              {(() => {
                const { Icon: TypeIcon, tint } = fileTypeVisual(imp);
                return (
                  <div
                    className={cn(
                      "shrink-0 mt-0.5 w-8 h-8 rounded-md flex items-center justify-center",
                      tint,
                    )}
                  >
                    <TypeIcon className="w-4 h-4" />
                  </div>
                );
              })()}

              <div className="min-w-0 flex-1">
                {/* Row 1: name + status + account selector on the right */}
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-[13px] font-medium text-foreground truncate"
                    title={imp.file_name}
                  >
                    {imp.file_name}
                  </p>
                  {statusIndicator(imp)}
                  {imp.locked &&
                    (imp.status !== "NORMALIZED" ||
                      (mismatchByImport[imp.id] || 0) > 0) && (
                      <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  <div className="ml-auto shrink-0 pl-2">
                    {cashAccounts.length > 0 ? (
                      <Select
                        value={imp.account_id || ""}
                        onValueChange={(v) => changeAcct(imp.id, v)}
                        disabled={!!imp.locked}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-7 w-auto min-w-[120px] max-w-[180px] border border-input bg-background px-2.5 text-[12px] font-medium text-foreground gap-1.5 hover:bg-accent hover:border-primary/40 transition-colors",
                            imp.locked && "opacity-60 cursor-not-allowed",
                          )}
                          title={imp.locked ? "Unlock the file to change account" : "Click to change account"}
                        >
                          <SelectValue placeholder="Pick account">
                            {acctName(imp.account_id)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {cashAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-sm">
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="truncate text-[12px] font-medium text-foreground">
                        {acctName(imp.account_id)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: meta + delete on the right */}
                <div className="mt-2.5 flex items-center gap-x-2 text-[11px] text-muted-foreground whitespace-nowrap">

                  <span className="font-medium tabular-nums">
                    {fileTypeLabel(imp)}
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
                        <span className="tabular-nums shrink-0">
                          {imp.transactions_count} tx
                        </span>
                      </>
                    )}
                  {(imp.status === "FAILED" || imp.status === "PARTIAL") && retryImport && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto shrink-0 h-7 gap-1 px-2 text-[11px]"
                      disabled={retryingImportIds?.has(imp.id)}
                      title={imp.status === "PARTIAL" ? "Retry the rows that failed" : "Retry processing this file"}
                      onClick={() =>
                        retryImport(imp.id, imp.file_storage_url, imp.file_name, imp.account_id)
                      }
                    >
                      {retryingImportIds?.has(imp.id) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      Retry
                    </Button>
                  )}
                  <div
                    className={cn(
                      "shrink-0 pl-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity",
                      !(imp.status === "FAILED" || imp.status === "PARTIAL") && "ml-auto",
                    )}
                  >
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

              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
