import { useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, Download, Archive, ArchiveRestore, Trash2, ChevronRight, AlertTriangle, RotateCcw, Loader2, Pencil, ExternalLink, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useImports, type Import } from "@/hooks/useImports";
import { importTitle, useImportSummary, getImportDownloadUrl, monthsInRange, useRenameImport, useReassignImport } from "@/hooks/useImportFile";
import { ImportSplitDialog } from "@/components/imports/ImportSplitDialog";
import { AccountSelectDialog } from "@/components/imports/AccountSelectDialog";
import { getAccountDisplayName } from "@/lib/accountColors";
import { useLocalization } from "@/hooks/useLocalization";
import { WorkspaceBanner } from "@/components/layout/WorkspaceShell";
import { getFileKind } from "@/components/account/fileBits";
import { FileContentsModal } from "@/components/account/FileContentsModal";
import { ProcessingPanel } from "@/components/imports/cashflow/ProcessingPanel";
import { toast } from "sonner";
import { useSetImportArchived } from "@/hooks/useImportFile";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { uploadFileRejection } from "@/lib/fileExtract";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RoleTab = "bank" | "investment";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXT_STYLES: Record<string, string> = {
  CSV: "bg-primary/10 text-primary",
  PDF: "bg-destructive/10 text-destructive",
  XLSX: "bg-success/10 text-success",
  XLS: "bg-success/10 text-success",
};

function FileBadge({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] text-[10.5px] font-bold uppercase",
        EXT_STYLES[label] ?? "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function ActionBtn({
  children, onClick, title, className,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={title}
      aria-label={title}
      className={cn(
        "flex h-[30px] w-[30px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

function relativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("imports.justNow");
  if (mins < 60) return t("imports.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("imports.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("imports.daysAgo", { count: days });
}

function fileStatus(f: Import): { key: string; color: string; actionable?: boolean } {
  if (f.split_tracks?.status === "pending")
    return { key: "pendingAction", color: "bg-warning/20 text-warning-foreground", actionable: true };
  if (f.status === "FAILED")
    return { key: "failed", color: "bg-destructive/10 text-destructive" };
  if (f.status === "PARTIAL")
    return { key: "partial", color: "bg-warning/20 text-warning-foreground" };
  if (f.status !== "NORMALIZED")
    return { key: "processing", color: "bg-primary/10 text-primary" };
  return { key: "processed", color: "bg-success/10 text-success" };
}

// ---------------------------------------------------------------------------
// Expanded detail panel (Carga + Resumen)
// ---------------------------------------------------------------------------

function FileExpandedPanel({ file, accountName, locale, accounts, onAccountChange, onOpenInTransactions }: {
  file: Import;
  accountName: string;
  locale: string;
  accounts: Array<{ id: string; account_role: string; institution: string; name: string }>;
  onAccountChange: (importId: string, accountId: string) => void;
  onOpenInTransactions: (month: string) => void;
}) {
  const { t } = useTranslation("account");
  const { formatDateTime, formatDate } = useLocalization();
  const { data: summary, isLoading } = useImportSummary(file.id);

  const period = summary?.firstDate && summary.lastDate
    ? monthsInRange(summary.firstDate, summary.lastDate, locale)
    : "—";

  const targetMonth = file.target_month?.substring(0, 7)
    || (summary?.firstDate ? summary.firstDate.substring(0, 7) : null);

  const cashAccounts = accounts.filter((a) => a.account_role === "CASH");

  const MetaRow = ({ label, value, numeric }: { label: string; value: React.ReactNode; numeric?: boolean }) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-[6px] last:border-0">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <span className={cn(
        "text-right text-[12.5px] font-semibold text-foreground",
        numeric && "font-title text-[13px] font-bold tabular-nums",
      )}>
        {value}
      </span>
    </div>
  );

  const hasError = (file.status === "FAILED" || file.status === "PARTIAL") && file.error_message;

  const accountSelector = file.domain !== "INVESTING" && cashAccounts.length > 0 ? (
    <select
      value={file.account_id || ""}
      onChange={(e) => onAccountChange(file.id, e.target.value)}
      disabled={!!file.locked}
      className={cn(
        "h-6 w-full max-w-[180px] rounded-md border border-border/60 bg-card px-2 text-right text-[12.5px] font-semibold text-foreground",
        file.locked && "opacity-50 cursor-not-allowed",
      )}
    >
      <option value="" disabled>{t("files.pickAccount")}</option>
      {cashAccounts.map((a) => (
        <option key={a.id} value={a.id}>{getAccountDisplayName(a)}</option>
      ))}
    </select>
  ) : <span className="text-[12.5px] font-semibold text-foreground">{accountName}</span>;

  return (
    <div className="space-y-3 px-1 pb-4 pt-1">
      {hasError && (
        <div className={cn(
          "rounded-xl px-4 py-3",
          file.status === "FAILED" ? "bg-destructive/8" : "bg-warning/10",
        )}>
          <p className={cn(
            "text-[10.5px] font-bold uppercase tracking-[0.09em] mb-1.5",
            file.status === "FAILED" ? "text-destructive/70" : "text-warning-foreground/70",
          )}>
            {t("files.detail.error", "Error")}
          </p>
          <p className={cn(
            "text-[12px] leading-relaxed",
            file.status === "FAILED" ? "text-destructive" : "text-warning-foreground",
          )}>
            {file.error_message}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="rounded-xl bg-muted/50 px-4 py-3.5">
          <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">
            {t("files.detail.upload", "Upload")}
          </p>
          <MetaRow label={t("files.detail.uploadedAt", "Uploaded on")} value={formatDateTime(file.uploaded_at)} />
          <MetaRow label={t("files.detail.account", "Account")} value={accountSelector} />
          <MetaRow label={t("files.detail.transactionCount", "Transactions")} value={isLoading ? "…" : (summary?.total ?? 0)} numeric />
        </div>
        <div className="rounded-xl bg-muted/50 px-4 py-3.5">
          <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">
            {t("files.detail.dates", "Dates")}
          </p>
          <MetaRow label={t("files.detail.period", "Period")} value={isLoading ? "…" : period} />
          <MetaRow label={t("files.detail.from", "From")} value={isLoading ? "…" : (summary?.firstDate ? formatDate(summary.firstDate) : "—")} />
          <MetaRow label={t("files.detail.to", "To")} value={isLoading ? "…" : (summary?.lastDate ? formatDate(summary.lastDate) : "—")} />
        </div>
      </div>
      {targetMonth && file.status === "NORMALIZED" && (
        <button
          type="button"
          onClick={() => onOpenInTransactions(targetMonth)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("files.detail.openInTransactions", "Open in Transactions")}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilesWorkspace
// ---------------------------------------------------------------------------

export function FilesWorkspace() {
  const { t } = useTranslation("account");
  const { t: tc } = useTranslation("common");
  const { t: ti } = useTranslation("imports");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts } = useAccounts();
  const { imports, isLoading, deleteImport, isDeleting } = useImports();
  const setArchived = useSetImportArchived();
  const renameImport = useRenameImport();
  const reassignImport = useReassignImport();
  const { addFiles, pendingFilesByMonth, cancelFile, isProcessingAny, retryImport, retryingImportIds } = useMonthlyFileUpload();
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const accountFilter = searchParams.get("account");
  const initialFile = imports.find((i) => i.id === searchParams.get("file"));
  const filterAccount = accounts.find((a) => a.id === accountFilter);
  const [role, setRole] = useState<RoleTab>(
    initialFile ? (initialFile.domain === "INVESTING" ? "investment" : "bank")
      : filterAccount?.account_role === "INVESTMENT" ? "investment" : "bank",
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "archive" | "delete"; file: Import } | null>(null);
  const [splitFile, setSplitFile] = useState<Import | null>(null);

  const inRole = useMemo(
    () => imports.filter((i) => (i.domain === "INVESTING") === (role === "investment") && (!accountFilter || i.account_id === accountFilter)),
    [imports, role, accountFilter],
  );
  const byUpload = (a: Import, b: Import) => b.uploaded_at.localeCompare(a.uploaded_at);
  const active = useMemo(() => inRole.filter((i) => !i.archived).sort(byUpload), [inRole]);
  const archived = useMemo(() => inRole.filter((i) => i.archived).sort(byUpload), [inRole]);

  const counts = useMemo(() => ({
    bank: imports.filter((i) => i.domain !== "INVESTING" && !i.archived).length,
    investment: imports.filter((i) => i.domain === "INVESTING" && !i.archived).length,
  }), [imports]);
  const accountsWithFiles = new Set(imports.filter((i) => !i.archived).map((i) => i.account_id).filter(Boolean)).size;

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    setSearchParams(next, { replace: true });
  };

  const switchRole = (next: RoleTab) => {
    setRole(next);
    setExpandedId(null);
    updateParams({ file: null, account: null });
  };

  const accountName = (id: string | null) => {
    const a = accounts.find((x) => x.id === id);
    return a ? getAccountDisplayName(a) : t("files.unassigned", "Unassigned");
  };

  const handleDownload = async (f: Import) => {
    const url = await getImportDownloadUrl(f);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error(t("files.noOriginal"));
  };

  const handleArchive = async () => {
    if (!confirmAction || confirmAction.type !== "archive") return;
    const file = confirmAction.file;
    setConfirmAction(null);
    try {
      await setArchived(file.id, !file.archived);
      toast.success(file.archived ? t("files.restored") : t("files.archived"));
    } catch {
      toast.error(t("files.archiveError"));
    }
  };

  const handleDelete = () => {
    if (!confirmAction || confirmAction.type !== "delete") return;
    const id = confirmAction.file.id;
    setConfirmAction(null);
    if (expandedId === id) setExpandedId(null);
    deleteImport(id);
  };

  const handleRenameStart = (f: Import) => {
    setRenamingId(f.id);
    setRenameValue(importTitle(f));
  };

  const handleRenameConfirm = async () => {
    if (!renamingId) return;
    try {
      await renameImport(renamingId, renameValue);
      toast.success(t("files.renamed"));
    } catch {
      toast.error(t("files.renameError"));
    }
    setRenamingId(null);
  };

  const handleReassign = async (importId: string, accountId: string) => {
    try {
      await reassignImport(importId, accountId);
      toast.success(t("files.moved", { name: accountName(accountId) }));
    } catch {
      toast.error(t("files.moveError"));
    }
  };

  const handleOpenInTransactions = (month: string) => {
    navigate(`/my-data?tab=transactions&month=${month}`);
  };

  const handleUploadPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      const reason = uploadFileRejection(f);
      if (reason) toast.error(`Skipped ${f.name}`, { description: reason });
      else valid.push(f);
    }
    if (valid.length) {
      setPendingUploadFiles(valid);
      setAccountDialogOpen(true);
    }
    e.target.value = "";
  };

  const handleAccountConfirm = (accountId: string) => {
    setAccountDialogOpen(false);
    if (pendingUploadFiles.length) {
      addFiles(pendingUploadFiles, accountId);
      setPendingUploadFiles([]);
    }
  };

  const activePending = [
    ...(pendingFilesByMonth["__auto__"] || []),
  ].filter((f) => f.status === "processing" || f.status === "pending");

  const locale = navigator.language;
  const previewFile = imports.find((i) => i.id === previewId) ?? null;

  const renderRow = (f: Import) => {
    const expanded = expandedId === f.id;
    const { label } = getFileKind(f);
    const title = importTitle(f);
    const account = accounts.find((a) => a.id === f.account_id);
    const accName = account ? getAccountDisplayName(account) : t("files.unassigned");
    const timeAgo = relativeTime(f.uploaded_at, tc);

    return (
      <div key={f.id} className={cn("border-b border-border/60 last:border-0", f.archived && "opacity-60")}>
        <div
          onClick={() => setExpandedId(expanded ? null : f.id)}
          className="flex cursor-pointer items-center gap-3.5 rounded-[10px] px-1.5 py-3 transition-colors hover:bg-muted/40"
        >
          <FileBadge label={label} />

          <div className="min-w-0 flex-1">
            {renamingId === f.id ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRenameConfirm(); if (e.key === "Escape") setRenamingId(null); }}
                  className="h-6 min-w-0 flex-1 rounded border border-primary/40 bg-card px-1.5 text-[13.5px] font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                />
                <ActionBtn title={t("files.rename")} onClick={handleRenameConfirm}>
                  <Check className="h-3.5 w-3.5 text-success" />
                </ActionBtn>
                <ActionBtn title={tc("cancel")} onClick={() => setRenamingId(null)}>
                  <X className="h-3.5 w-3.5" />
                </ActionBtn>
              </div>
            ) : (
              <div className="group/title flex items-center gap-1">
                <p className="truncate text-[13.5px] font-semibold text-foreground" title={title}>{title}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRenameStart(f); }}
                  className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-primary group-hover/title:flex"
                  title={t("files.rename")}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {accName} · {f.transactions_count ?? 0} {t("files.txShort", "tx")}
            </p>
          </div>

          {(() => {
            const st = fileStatus(f);
            const errorTip = (f.status === "FAILED" || f.status === "PARTIAL") ? f.error_message : undefined;
            const pill = (
              <>
                {st.actionable && <AlertTriangle className="h-2.5 w-2.5" />}
                {t(`files.status.${st.key}`)}
              </>
            );
            return st.actionable ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSplitFile(f); }}
                className={cn("flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity", st.color)}
              >
                {pill}
              </button>
            ) : (
              <span
                className={cn("flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", st.color)}
                title={errorTip || undefined}
              >
                {pill}
              </span>
            );
          })()}

          <span className="hidden shrink-0 text-[11.5px] text-muted-foreground sm:inline">{timeAgo}</span>

          <span className="flex shrink-0 items-center gap-0.5">
            {(f.status === "FAILED" || f.status === "PARTIAL") && (
              <ActionBtn
                title={t("files.actions.retry", "Retry")}
                onClick={() => retryImport(f.id, f.file_storage_url, f.file_name, f.account_id)}
                className={cn(
                  "text-primary hover:bg-primary/10",
                  retryingImportIds.has(f.id) && "pointer-events-none opacity-60",
                )}
              >
                {retryingImportIds.has(f.id)
                  ? <Loader2 className="h-[15px] w-[15px] animate-spin" />
                  : <RotateCcw className="h-[14px] w-[14px]" />}
              </ActionBtn>
            )}
            <ActionBtn title={t("files.actions.view", "View contents")} onClick={() => setPreviewId(f.id)}>
              <Eye className="h-[15px] w-[15px]" />
            </ActionBtn>
            <ActionBtn title={t("files.download")} onClick={() => handleDownload(f)} className="hidden sm:flex">
              <Download className="h-[14px] w-[14px]" />
            </ActionBtn>
            <ActionBtn
              title={f.archived ? t("files.restore") : t("files.archive")}
              onClick={() => setConfirmAction({ type: "archive", file: f })}
              className="hidden sm:flex"
            >
              {f.archived ? <ArchiveRestore className="h-[14px] w-[14px]" /> : <Archive className="h-[14px] w-[14px]" />}
            </ActionBtn>
            <ActionBtn
              title={t("files.delete")}
              className="hidden hover:bg-destructive/10 hover:text-destructive sm:flex"
              onClick={() => setConfirmAction({ type: "delete", file: f })}
            >
              <Trash2 className="h-[14px] w-[14px]" />
            </ActionBtn>
            <span className={cn(
              "flex h-[30px] w-[30px] items-center justify-center text-muted-foreground transition-transform",
              expanded && "rotate-90",
            )}>
              <ChevronRight className="h-[14px] w-[14px]" />
            </span>
          </span>
        </div>

        {expanded && (
          <FileExpandedPanel
            file={f}
            accountName={accName}
            locale={locale}
            accounts={accounts}
            onAccountChange={handleReassign}
            onOpenInTransactions={handleOpenInTransactions}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-background md:h-full md:overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".xlsx,.csv,.pdf,.jpg,.jpeg,.png,.webp,.heic"
        onChange={handleUploadPicked}
      />

      <WorkspaceBanner
        title={t("files.title", "Files")}
        subtitle={t("files.subtitle", { files: active.length, accounts: accountsWithFiles })}
        action={role === "bank" ? { label: t("files.newFile", "New file"), onClick: () => fileInputRef.current?.click() } : undefined}
        selector={{
          value: role,
          onChange: switchRole,
          options: [
            { value: "bank", label: t("workspace.bank", "Bank"), count: counts.bank },
            { value: "investment", label: t("workspace.investment", "Investment"), count: counts.investment },
          ],
        }}
      />

      <div className="px-3 pb-6 pt-4 md:-mt-[102px] md:min-h-0 md:flex-1 md:overflow-y-auto md:px-[34px] md:pb-8 md:pt-0">
        {filterAccount && (
          <div className="mb-2 flex items-center gap-2 md:mb-3">
            <button
              type="button"
              onClick={() => updateParams({ account: null })}
              className="flex max-w-[220px] items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[12px] font-medium text-primary shadow-sm"
              title={t("files.clearFilter")}
            >
              <span className="truncate">{getAccountDisplayName(filterAccount)}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          </div>
        )}

        <div className="rounded-[14px] bg-card px-[22px] py-2 shadow-bento">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-[52px] animate-pulse rounded-[10px] bg-muted" />)}
            </div>
          ) : active.length === 0 && archived.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("files.empty")}</p>
          ) : (
            <>
              {active.map(renderRow)}
              {archived.length > 0 && (
                <div className="mt-2 border-t border-border/60 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowArchived((v) => !v)}
                    className="flex w-full items-center gap-2 px-1.5 py-2 text-left"
                    aria-expanded={showArchived}
                  >
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">
                      {t("files.archivedSection")}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground">
                      {archived.length}
                    </span>
                  </button>
                  {showArchived && archived.map(renderRow)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* File contents modal */}
      {previewFile && (
        <FileContentsModal
          file={previewFile}
          accountName={accountName(previewFile.account_id)}
          locale={locale}
          currency={accounts.find((a) => a.id === previewFile.account_id)?.currency_base}
          onClose={() => setPreviewId(null)}
        />
      )}

      {/* Archive confirmation */}
      <AlertDialog open={confirmAction?.type === "archive"} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.file?.archived ? t("files.restoreTitle") : t("files.archiveTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {confirmAction?.file?.archived ? (
                  <p>{t("files.restoreBody")}</p>
                ) : (
                  <>
                    <p>{t("files.archiveBody", { name: confirmAction?.file ? importTitle(confirmAction.file) : "" })}</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      <li>{t("files.archiveKeeps")}</li>
                      <li>{t("files.archiveRestore")}</li>
                    </ul>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              {confirmAction?.file?.archived ? t("files.restore") : t("files.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Split resolution dialog */}
      {splitFile?.split_tracks?.tracks && (
        <ImportSplitDialog
          open={!!splitFile}
          onOpenChange={(open) => { if (!open) setSplitFile(null); }}
          pendingSplit={{
            importId: splitFile.id,
            tracks: splitFile.split_tracks.tracks,
          }}
          primaryAccountId={splitFile.account_id ?? undefined}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={confirmAction?.type === "delete"} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("files.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>{t("files.deleteBody", { name: confirmAction?.file ? importTitle(confirmAction.file) : "" })}</p>
                <p className="text-muted-foreground">{t("files.deleteAlt")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload processing panel */}
      {activePending.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
          <ProcessingPanel
            files={activePending}
            onCancel={(fileId) => cancelFile("__auto__", fileId)}
          />
        </div>
      )}

      {/* Account selection for upload */}
      <AccountSelectDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onConfirm={handleAccountConfirm}
        domain="CASHFLOW"
      />
    </div>
  );
}
