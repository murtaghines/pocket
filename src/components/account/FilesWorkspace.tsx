import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, Download, Archive, ArchiveRestore, Trash2, ChevronRight, GitBranch, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useImports, type Import } from "@/hooks/useImports";
import { importTitle, useImportSummary, getImportDownloadUrl, monthsInRange } from "@/hooks/useImportFile";
import { getAccountDisplayName } from "@/lib/accountColors";
import { WorkspaceBanner } from "@/components/layout/WorkspaceShell";
import { getFileKind } from "@/components/account/fileBits";
import { FileContentsModal } from "@/components/account/FileContentsModal";
import { toast } from "sonner";
import { useSetImportArchived } from "@/hooks/useImportFile";
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

// ---------------------------------------------------------------------------
// Expanded detail panel (Carga + Resumen)
// ---------------------------------------------------------------------------

function FileExpandedPanel({ file, accountName, locale, currency }: {
  file: Import;
  accountName: string;
  locale: string;
  currency?: string;
}) {
  const { t } = useTranslation("account");
  const { formatDateTime, formatCurrency } = useLocalization();
  const { data: summary, isLoading } = useImportSummary(file.id);

  const period = summary?.firstDate && summary.lastDate
    ? monthsInRange(summary.firstDate, summary.lastDate, locale)
    : "—";

  const money = (n: number) => formatCurrency(n, currency);

  const MetaRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-[7px] last:border-0">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-foreground">{value}</span>
    </div>
  );

  const SummaryRow = ({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-[7px] last:border-0">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className={cn("text-right font-heading text-[13px] font-bold tabular-nums", color ?? "text-foreground")}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-3 px-1.5 pb-4 pt-0.5 md:grid-cols-2">
      <div className="rounded-xl bg-muted/50 px-4 py-3">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">
          {t("files.detail.upload", "Upload")}
        </p>
        <MetaRow label={t("files.detail.uploadedAt", "Uploaded on")} value={formatDateTime(file.uploaded_at)} />
        <MetaRow label={t("files.detail.account", "Account")} value={accountName} />
        <MetaRow label={t("files.detail.period", "Period")} value={isLoading ? "…" : period} />
      </div>
      <div className="rounded-xl bg-muted/50 px-4 py-3">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">
          {t("files.detail.summary", "Summary")}
        </p>
        <SummaryRow
          label={t("files.detail.transactionCount", "Transactions")}
          value={isLoading ? "…" : (summary?.total ?? 0)}
        />
        <SummaryRow
          label={t("files.detail.income", "Income")}
          value={isLoading ? "…" : money(summary?.income ?? 0)}
          color={summary?.income ? "text-success" : "text-muted-foreground"}
        />
        <SummaryRow
          label={t("files.detail.expenses", "Expenses")}
          value={isLoading ? "…" : money(summary?.expenses ?? 0)}
          color={summary?.expenses ? "text-destructive" : "text-muted-foreground"}
        />
        <SummaryRow
          label={t("files.detail.transfers", "Transfers")}
          value={isLoading ? "…" : money(summary?.transferNet ?? 0)}
          color="text-muted-foreground"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilesWorkspace
// ---------------------------------------------------------------------------

export function FilesWorkspace() {
  const { t } = useTranslation("account");
  const { t: tc } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts } = useAccounts();
  const { imports, isLoading, deleteImport, isDeleting } = useImports();
  const setArchived = useSetImportArchived();
  const [showArchived, setShowArchived] = useState(false);

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
            <p className="truncate font-heading text-[13.5px] font-semibold text-foreground" title={title}>{title}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {accName} · {f.transactions_count ?? 0} {t("files.txShort", "tx")}
            </p>
          </div>

          {f.split_tracks?.status === "pending" && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10.5px] font-semibold text-warning-foreground">
              <GitBranch className="h-2.5 w-2.5" />
              {t("files.pendingSplit")}
            </span>
          )}

          {f.status !== "NORMALIZED" && (
            <span className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              f.status === "FAILED" ? "bg-destructive/10 text-destructive" : "bg-warning/20 text-warning-foreground",
            )}>
              {t(`files.status.${f.status === "FAILED" ? "failed" : f.status === "PARTIAL" ? "partial" : "processing"}`)}
            </span>
          )}

          <span className="hidden shrink-0 text-[11.5px] text-muted-foreground sm:inline">{timeAgo}</span>

          <span className="flex shrink-0 items-center gap-0.5">
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
            currency={account?.currency_base}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-background md:h-full md:overflow-hidden">
      <WorkspaceBanner
        title={t("files.title", "Files")}
        subtitle={t("files.subtitle", { files: active.length, accounts: accountsWithFiles })}
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
    </div>
  );
}
