import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  ChevronRight,
  CheckCircle2,
  Trash2,
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
import { useLocalization } from "@/hooks/useLocalization";
import type { Import } from "@/hooks/useImports";

export interface UploadedFilesDropdownProps {
  imports: Import[];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  pendingImportIds: Set<string>;
}

export function UploadedFilesDropdown({
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

export interface UploadedFilesHistoryListProps {
  imports: Import[];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  pendingImportIds: Set<string>;
}

export function UploadedFilesHistoryList({
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
