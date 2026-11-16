import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Import } from "@/hooks/useImports";
import { useImportTransactions, importTitle, getImportDownloadUrl, monthsInRange } from "@/hooks/useImportFile";
import { useCategories } from "@/hooks/useCategories";
import { useLocalization } from "@/hooks/useLocalization";
import { getFileKind } from "@/components/account/fileBits";
import { toast } from "sonner";

interface Props {
  file: Import;
  accountName: string;
  locale: string;
  currency?: string;
  onClose: () => void;
}

const EXT_STYLES: Record<string, string> = {
  CSV: "bg-primary/10 text-primary",
  PDF: "bg-destructive/10 text-destructive",
  XLSX: "bg-success/10 text-success",
  XLS: "bg-success/10 text-success",
};

const MOVEMENT_STYLES = {
  INCOME: { bg: "bg-success/[0.14]", text: "text-success", dot: "bg-success" },
  EXPENSE: { bg: "bg-destructive/[0.14]", text: "text-destructive", dot: "bg-destructive" },
  TRANSFER: { bg: "bg-muted-foreground/[0.16]", text: "text-muted-foreground", dot: "bg-muted-foreground" },
} as const;

export function FileContentsModal({ file, accountName, locale, currency, onClose }: Props) {
  const { t } = useTranslation("account");
  const navigate = useNavigate();
  const { formatDate, formatCurrency } = useLocalization();
  const { data: rows, isLoading } = useImportTransactions(file.id);
  const { categories } = useCategories(file.domain === "INVESTING" ? "INVESTING" : "CASHFLOW");
  const { label: ext } = getFileKind(file);
  const title = importTitle(file);

  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));

  const dates = (rows ?? []).map((r) => r.date).filter(Boolean).sort();
  const firstDate = dates[0] ?? null;
  const lastDate = dates[dates.length - 1] ?? null;
  const period = firstDate && lastDate ? monthsInRange(firstDate, lastDate, locale) : "";

  const movementLabel = (m: string) =>
    m === "INCOME" ? t("files.modal.income", "Income")
    : m === "EXPENSE" ? t("files.modal.expense", "Expense")
    : t("files.modal.transfer", "Transfer");

  const money = (n: number) => formatCurrency(n, currency);

  const handleDownload = async () => {
    const url = await getImportDownloadUrl(file);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error(t("files.noOriginal"));
  };

  const handleOpenInTransactions = () => {
    onClose();
    navigate("/my-data");
  };

  const total = rows?.length ?? 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="flex max-h-[84vh] w-[880px] max-w-[calc(100%-48px)] flex-col gap-0 overflow-hidden rounded-[14px] border-0 p-0 shadow-popup"
        hideCloseButton
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 px-[22px] pb-4 pt-[18px]">
          <span className={cn(
            "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] text-[10.5px] font-bold uppercase",
            EXT_STYLES[ext] ?? "bg-muted text-muted-foreground",
          )}>
            {ext}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-base font-bold text-foreground">{title}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {accountName}{period ? ` · ${period}` : ""} · {isLoading ? "…" : total} {t("files.detail.transactionCount", "transactions").toLowerCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("files.close", "Close")}
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
          >
            <X className="h-[14px] w-[14px]" />
          </button>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[520px] border-collapse text-[13px] text-foreground">
            <thead>
              <tr className="bg-muted/60">
                {[
                  { label: t("files.col.date"), w: 72, align: "text-left", pl: "pl-[22px]" },
                  { label: t("files.col.description"), align: "text-left" },
                  { label: t("files.modal.type", "Type"), w: 130, align: "text-left" },
                  { label: t("files.modal.category", "Category"), w: 150, align: "text-left" },
                  { label: t("files.col.amount"), w: 120, align: "text-right", pr: "pr-[22px]" },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={cn(
                      "sticky top-0 z-10 border-y border-border/60 bg-muted/60 px-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground",
                      col.align, col.pl, col.pr,
                    )}
                    style={col.w ? { width: col.w } : undefined}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">…</td></tr>
              ) : total === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">{t("files.noPreview")}</td></tr>
              ) : (rows ?? []).map((r) => {
                const mv = MOVEMENT_STYLES[r.movement] ?? MOVEMENT_STYLES.EXPENSE;
                const cat = r.category_id ? categoryMap.get(r.category_id) : null;
                return (
                  <tr key={r.id} className="h-10 border-b border-border/40 transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-2.5 py-0 pl-[22px] tabular-nums text-muted-foreground">
                      {r.date ? formatDate(r.date) : "—"}
                    </td>
                    <td className="max-w-0 truncate px-2.5 py-0 font-medium" title={r.description}>
                      {r.description}
                    </td>
                    <td className="px-2.5 py-0">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-medium",
                        mv.bg, mv.text,
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", mv.dot)} />
                        {movementLabel(r.movement)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-0">
                      {cat ? (
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground/80">
                          <span
                            className="h-[7px] w-[7px] shrink-0 rounded-full"
                            style={{ background: cat.color ?? "hsl(var(--muted-foreground))" }}
                          />
                          {cat.name}
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn(
                      "whitespace-nowrap px-2.5 py-0 pr-[22px] text-right font-medium tabular-nums",
                      r.amount === 0
                        ? "text-muted-foreground"
                        : r.movement === "TRANSFER"
                          ? "text-muted-foreground"
                          : "text-foreground",
                    )}>
                      {money(r.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2.5 border-t border-border/60 bg-muted/60 px-[22px] py-3">
          <span className="flex-1 text-[12.5px] text-muted-foreground">
            {t("files.preview.showing", { shown: total, total })}
          </span>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-[9px] bg-card px-3 py-[7px] text-[13px] font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <Download className="h-[14px] w-[14px] text-muted-foreground" />
            {t("files.download")}
          </button>
          <button
            type="button"
            onClick={handleOpenInTransactions}
            className="rounded-[9px] bg-primary px-3.5 py-[8px] text-[13px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {t("files.preview.openInTransactions", "Open in Transactions")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
