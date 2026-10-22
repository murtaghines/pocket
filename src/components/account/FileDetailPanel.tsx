import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MoreHorizontal, Download, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useState } from "react";
import type { Import } from "@/hooks/useImports";
import { useAccounts } from "@/hooks/useAccounts";
import { useImportPreview, useReassignImport, getImportDownloadUrl } from "@/hooks/useImportFile";
import { useLocalization } from "@/hooks/useLocalization";
import { getAccountDisplayName } from "@/lib/accountColors";
import { cn } from "@/lib/utils";
import { getFileKind, formatBytes, ImportStatusPill, FileTypeIcon } from "@/components/account/fileBits";

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
  const { data: preview, isLoading } = useImportPreview(file);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);

  const isInvestment = file.domain === "INVESTING";
  const { label: kind } = getFileKind(file);
  const account = accounts.find((a) => a.id === file.account_id);
  const candidates = accounts.filter((a) => !a.archived && (a.account_role === "INVESTMENT") === isInvestment);
  const currency = account?.currency_base;
  const size = formatBytes(file.file_size);
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

  const handleDownload = async () => {
    const url = await getImportDownloadUrl(file);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error(t("files.noOriginal", "The original file wasn't kept for this upload"));
  };

  const money = (n: number) => formatCurrency(n, currency);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] bg-card shadow-bento">
      {/* Hero */}
      <div className="shrink-0 border-b border-border px-[22px] pb-3.5 pt-4" style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--card)) 70%)" }}>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
          <FileTypeIcon label={kind} width={42} />
          <div className="min-w-[160px] flex-1">
            <h2 className="truncate text-[17px] font-bold text-foreground" title={file.file_name}>{file.file_name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ImportStatusPill status={file.status} label={statusLabels} />
              {file.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label={t("files.locked", "Locked")} />}
              {account && <span className="text-[12px] font-medium text-muted-foreground">{getAccountDisplayName(account)}</span>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0 text-muted-foreground" aria-label={t("detail.more", "More actions")}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDownload} disabled={!file.file_storage_url}>
                <Download className="mr-2 h-4 w-4" />
                {t("files.download", "Download original")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={file.locked || isDeleting} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("files.delete", "Delete file")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {file.error_message && (
          <div className="mx-[22px] mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
            {file.error_message}
          </div>
        )}

        {/* File info */}
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
            <Row label={t("files.modified", "Last modified")}>
              {isInvestment ? "—" : isLoading ? "…" : preview?.lastModified
                ? <span className="tabular-nums">{formatDateTime(preview.lastModified)}</span>
                : <span className="font-normal text-muted-foreground">{t("files.neverEdited", "Not edited since upload")}</span>}
            </Row>
            <Row label={t("files.period", "Period")}>{isLoading ? "…" : period}</Row>
            <Row label={isInvestment ? t("files.movements", "Movements") : t("files.transactions", "Transactions")}>
              <span className="tabular-nums">{isLoading ? "…" : (preview?.total ?? file.transactions_count ?? 0).toLocaleString()}</span>
            </Row>
          </dl>
        </section>

        {/* Raw data preview */}
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("files.deleteTitle", "Delete file?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("files.deleteBody", { name: file.file_name, defaultValue: "This permanently removes {{name}} and all of its transactions. This can't be undone." })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("accounts.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(file.id)}
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
