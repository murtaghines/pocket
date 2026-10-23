import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Archive, ArchiveRestore, Trash2, Lock, Pencil, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Import } from "@/hooks/useImports";
import { useAccounts } from "@/hooks/useAccounts";
import {
  useImportPreview,
  useReassignImport,
  useRenameImport,
  useSetImportArchived,
  useImportLastEdits,
  getImportDownloadUrl,
  importTitle,
} from "@/hooks/useImportFile";
import { useLocalization } from "@/hooks/useLocalization";
import { getAccountDisplayName } from "@/lib/accountColors";
import { cn } from "@/lib/utils";
import { getFileKind, formatBytes, ImportStatusPill, FileTypeIcon } from "@/components/account/fileBits";
import { IconAction } from "@/components/account/IconAction";

interface FileDetailPanelProps {
  file: Import;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-3 py-2 sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-[13.5px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function FileDetailPanel({ file, onDelete, isDeleting }: FileDetailPanelProps) {
  const { t } = useTranslation("account");
  const { formatDateTime, formatDate, formatMonthShort, formatCurrency } = useLocalization();
  const { accounts } = useAccounts();
  const reassign = useReassignImport();
  const rename = useRenameImport();
  const setArchived = useSetImportArchived();
  const { data: preview, isLoading } = useImportPreview(file);
  const { data: lastEdits } = useImportLastEdits();

  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [moving, setMoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => { setEditing(false); }, [file.id]);

  const title = importTitle(file);
  const isInvestment = file.domain === "INVESTING";
  const { label: kind } = getFileKind(file);
  const account = accounts.find((a) => a.id === file.account_id);
  const candidates = accounts.filter((a) => !a.archived && (a.account_role === "INVESTMENT") === isInvestment);
  const currency = account?.currency_base;
  const size = formatBytes(file.file_size);
  const lastEdited = lastEdits?.get(file.id) ?? null;
  const statusLabels = {
    UPLOADED: t("files.status.uploading", "Uploading"),
    PARSED: t("files.status.processing", "Processing"),
    NORMALIZED: t("files.status.ready", "Ready"),
    PARTIAL: t("files.status.partial", "Partial"),
    FAILED: t("files.status.failed", "Failed"),
  };

  const monthLabel = (d: string) => `${formatMonthShort(d)} ${d.slice(0, 4)}`;
  const period = preview?.firstDate && preview.lastDate
    ? preview.firstDate.slice(0, 7) === preview.lastDate.slice(0, 7)
      ? monthLabel(preview.firstDate)
      : `${monthLabel(preview.firstDate)} – ${monthLabel(preview.lastDate)}`
    : "—";

  const handleMove = async (accountId: string) => {
    if (!accountId || accountId === file.account_id) return;
    setMoving(true);
    try {
      await reassign(file.id, accountId);
      const target = accounts.find((a) => a.id === accountId);
      toast.success(t("files.moved", { name: target ? getAccountDisplayName(target) : "", defaultValue: "File moved to {{name}}" }));
    } catch {
      toast.error(t("files.moveError", "Couldn't move the file"));
    } finally {
      setMoving(false);
    }
  };

  const startEdit = () => { setDraft(title); setEditing(true); };
  const saveName = async () => {
    const next = draft.trim();
    setEditing(false);
    if (next === title) return;
    try {
      await rename(file.id, next);
      toast.success(t("files.renamed", "Name updated"));
    } catch {
      toast.error(t("files.renameError", "Couldn't rename the file"));
    }
  };

  const handleDownload = async () => {
    const url = await getImportDownloadUrl(file);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error(t("files.noOriginal", "The original file wasn't kept for this upload"));
  };

  const handleArchive = async () => {
    setConfirm(null);
    try {
      await setArchived(file.id, !file.archived);
      toast.success(file.archived ? t("files.restored", "File restored") : t("files.archived", "File archived"));
    } catch {
      toast.error(t("files.archiveError", "Couldn't update the file"));
    }
  };

  const money = (n: number) => formatCurrency(n, currency);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] bg-card shadow-bento">
      {/* Hero */}
      <div className="shrink-0 border-b border-border px-[22px] pb-3.5 pt-4" style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--card)) 70%)" }}>
        <div className="flex items-start gap-3.5">
          <FileTypeIcon label={kind} width={36} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(false); }}
                  aria-label={t("files.nameLabel", "File name")}
                  className="h-8 min-w-0 flex-1 rounded-lg bg-muted/60 px-2.5 text-[15px] font-bold text-foreground outline-none focus:bg-card focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={saveName} className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10" aria-label={t("accounts.save", "Save")}>
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setEditing(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label={t("accounts.cancel", "Cancel")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="group/title flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-[15px] font-bold text-foreground" title={title}>{title}</h2>
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover/title:opacity-100 focus:opacity-100"
                  aria-label={t("files.rename", "Rename")}
                  title={t("files.rename", "Rename")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground" title={file.file_name}>
              {t("files.identifier", "Uploaded as")} <span className="font-medium">{file.file_name}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {file.archived && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("files.archivedBadge", "Archived")}
                </span>
              )}
              <ImportStatusPill status={file.status} label={statusLabels} />
              {file.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label={t("files.locked", "Locked")} />}
              {account && <span className="text-[12px] font-medium text-muted-foreground">{getAccountDisplayName(account)}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconAction
              label={t("files.download", "Download original")}
              description={t("files.downloadHelp", "Gets the file exactly as you uploaded it.")}
              onClick={handleDownload}
            >
              <Download className="h-[18px] w-[18px]" />
            </IconAction>
            <IconAction
              label={file.archived ? t("files.restore", "Restore file") : t("files.archive", "Archive file")}
              description={file.archived
                ? t("files.restoreHelp", "Shows the file and its transactions again, in lists and analysis.")
                : t("files.archiveHelp", "Hides the file and its transactions from lists and analysis. Nothing is deleted.")}
              onClick={() => setConfirm("archive")}
            >
              {file.archived ? <ArchiveRestore className="h-[18px] w-[18px]" /> : <Archive className="h-[18px] w-[18px]" />}
            </IconAction>
            <IconAction
              label={t("files.delete", "Delete file")}
              description={t("files.deleteHelp", "Permanently deletes the file and all its transactions.")}
              tone="destructive"
              onClick={() => setConfirm("delete")}
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </IconAction>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {file.error_message && (
          <div className="mx-[22px] mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
            {file.error_message}
          </div>
        )}

        <section className="border-b border-border px-[22px] pb-3 pt-4">
          <h3 className="pb-1 text-[15px] font-bold text-foreground">{t("files.details", "Details")}</h3>
          <dl className="divide-y divide-border/60">
            <Row label={t("files.account", "Account")}>
              <div className="pk-select-wrap max-w-[320px]">
                <select
                  value={file.account_id ?? ""}
                  disabled={moving || file.locked}
                  onChange={(e) => handleMove(e.target.value)}
                  title={file.locked ? t("files.unlockToMove", "Unlock the file to change account") : undefined}
                  className={cn("h-9 w-full rounded-lg border border-input bg-background px-3 text-[13.5px] font-medium", (moving || file.locked) && "opacity-60")}
                >
                  <option value="" disabled>{t("files.pickAccount", "Pick account")}</option>
                  {candidates.map((a) => <option key={a.id} value={a.id}>{getAccountDisplayName(a)}</option>)}
                </select>
              </div>
            </Row>
            <Row label={t("files.type", "Type")}>{kind}{file.file_mime ? <span className="ml-2 font-normal text-muted-foreground">{file.file_mime}</span> : null}</Row>
            {size && <Row label={t("files.size", "Size")}>{size}</Row>}
            <Row label={t("files.uploaded", "Uploaded")}><span className="tabular-nums">{formatDateTime(file.uploaded_at)}</span></Row>
            <Row label={t("files.modified", "Last edited")}>
              {lastEdited
                ? <span className="tabular-nums">{formatDateTime(lastEdited)}</span>
                : <span className="font-normal text-muted-foreground">{t("files.neverEdited", "Not edited since upload")}</span>}
            </Row>
            <Row label={t("files.period", "Period")}>{isLoading ? "…" : period}</Row>
            <Row label={isInvestment ? t("files.movements", "Movements") : t("files.transactions", "Transactions")}>
              <span className="tabular-nums">{isLoading ? "…" : (preview?.total ?? file.transactions_count ?? 0).toLocaleString()}</span>
            </Row>
          </dl>
        </section>

        <section className="px-[22px] pb-5 pt-4">
          <h3 className="text-[15px] font-bold text-foreground">{t("files.preview", "Data preview")}</h3>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted-foreground">
            {preview?.source === "imported"
              ? t("files.previewImported", "Original bank text of the imported rows, before any edits. Pocket doesn't keep a raw copy of CSV and Excel files.")
              : t("files.previewExtracted", "Rows as Pocket read them from the file, before any edits.")}
          </p>
          {isLoading ? (
            <p className="py-4 text-sm text-muted-foreground">…</p>
          ) : !preview || preview.rows.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("files.noPreview", "No rows to show for this file.")}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[520px] text-left text-[12.5px]">
                  <thead className="bg-muted/60 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("files.col.date", "Date")}</th>
                      <th className="px-3 py-2 font-medium">{t("files.col.description", "Description")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("files.col.amount", "Amount")}</th>
                      <th className="px-3 py-2 text-right font-medium">{isInvestment ? t("files.col.type", "Type") : t("files.col.balance", "Balance")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {preview.rows.map((r) => (
                      <tr key={r.key}>
                        <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-muted-foreground">{r.date ? formatDate(r.date) : "—"}</td>
                        <td className="max-w-[320px] truncate px-3 py-1.5 text-foreground" title={r.description}>{r.description}</td>
                        <td className={cn("whitespace-nowrap px-3 py-1.5 text-right tabular-nums", r.amount == null || r.amount === 0 ? "text-muted-foreground" : "text-foreground")}>
                          {r.amount == null ? "—" : money(r.amount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {r.extra == null ? "—" : isInvestment ? r.extra : money(Number(r.extra))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.total > preview.rows.length && (
                <p className="pt-2 text-[12px] text-muted-foreground">
                  {t("files.showingRows", { shown: preview.rows.length, total: preview.total, defaultValue: "Showing {{shown}} of {{total}} rows" })}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <AlertDialog open={confirm === "archive"} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {file.archived ? t("files.restoreTitle", "Restore this file?") : t("files.archiveTitle", "Archive this file?")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {file.archived ? (
                  <p>{t("files.restoreBody", "Its transactions come back into your lists, balances and dashboard numbers.")}</p>
                ) : (
                  <>
                    <p>{t("files.archiveBody", "{{name}} and its transactions stop showing everywhere: lists, balances, the dashboard and any analysis.", { name: title })}</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      <li>{t("files.archiveKeeps", "Nothing is deleted. The file and its data are kept.")}</li>
                      <li>{t("files.archiveRestore", "You can restore it at any time from the archived section.")}</li>
                    </ul>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("accounts.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              {file.archived ? t("files.restore", "Restore file") : t("files.archive", "Archive file")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === "delete"} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("files.deleteTitle", "Are you sure you want to delete this file?")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>{t("files.deleteBody", { name: title, defaultValue: "{{name}} and all of its transactions are permanently deleted. This can't be undone." })}</p>
                <p className="text-muted-foreground">{t("files.deleteAlt", "If you only want it out of the way, archive it instead: nothing is lost.")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("accounts.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => { setConfirm(null); onDelete(file.id); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("accounts.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
