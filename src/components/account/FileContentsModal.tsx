import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Import } from "@/hooks/useImports";
import { useImportTransactions, importTitle, monthsInRange } from "@/hooks/useImportFile";
import { useLocalization } from "@/hooks/useLocalization";
import { getFileKind } from "@/components/account/fileBits";

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

type Slice = "last10" | "first10";

function isoWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

export function FileContentsModal({ file, accountName, locale, currency, onClose }: Props) {
  const { t } = useTranslation("account");
  const navigate = useNavigate();
  const { formatDate, formatCurrency } = useLocalization();
  const { data: rows, isLoading } = useImportTransactions(file.id);
  const { label: ext } = getFileKind(file);
  const title = importTitle(file);
  const [slice, setSlice] = useState<Slice>("last10");

  const sorted = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [rows]);

  const total = sorted.length;

  const visible = useMemo(() => {
    if (total <= 10) return sorted;
    if (slice === "last10") return sorted.slice(0, 10);
    return sorted.slice(-10);
  }, [sorted, total, slice]);

  const dates = sorted.map((r) => r.date).filter(Boolean).sort();
  const firstDate = dates[0] ?? null;
  const lastDate = dates[dates.length - 1] ?? null;
  const period = firstDate && lastDate ? monthsInRange(firstDate, lastDate, locale) : "";

  const handleOpenInTransactions = () => {
    onClose();
    navigate("/my-data");
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="flex max-h-[84vh] w-[960px] max-w-[calc(100%-48px)] flex-col gap-0 overflow-hidden rounded-[16px] border-0 p-0 shadow-popup"
        hideCloseButton
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 px-[26px] pb-4 pt-5">
          <span className={cn(
            "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] text-[10.5px] font-bold uppercase",
            EXT_STYLES[ext] ?? "bg-muted text-muted-foreground",
          )}>
            {ext}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-title text-base font-bold text-foreground">{title}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {accountName}{period ? ` · ${period}` : ""} · {isLoading ? "…" : total} {t("files.detail.transactionCount", "transactions").toLowerCase()}
            </p>
          </div>

          {/* Segmented selector */}
          <div
            role="group"
            className="flex shrink-0 items-center gap-0.5 rounded-[10px] bg-[hsl(225_14%_95%)] p-[3px]"
          >
            {(["last10", "first10"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-pressed={slice === key}
                onClick={() => setSlice(key)}
                className={cn(
                  "h-[28px] rounded-[8px] px-3 text-[12.5px] transition-all",
                  slice === key
                    ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                    : "bg-transparent font-medium text-muted-foreground hover:text-foreground/70",
                )}
              >
                {t(`files.preview.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[520px] border-collapse text-[13px] text-foreground">
            <thead>
              <tr>
                {[
                  { key: "date", label: t("files.col.date"), w: 100, align: "text-left", pl: "pl-[26px]" },
                  { key: "week", label: t("files.col.week"), w: 60, align: "text-left" },
                  { key: "amount", label: t("files.col.amount"), w: 116, align: "text-right" },
                  { key: "desc", label: t("files.col.description"), align: "text-left", pr: "pr-[26px]" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "sticky top-0 z-10 border-b border-border/60 bg-muted/60 px-2.5 py-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground",
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
                <tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">…</td></tr>
              ) : total === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">{t("files.noPreview")}</td></tr>
              ) : visible.map((r) => (
                <tr key={r.id} className="border-b border-border/30">
                  <td className="whitespace-nowrap px-2.5 py-3 pl-[26px] text-[12.5px] font-medium text-foreground/70 tabular-nums">
                    {r.date ? formatDate(r.date) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-3 text-[11.5px] font-medium text-muted-foreground">
                    {r.date ? `W${isoWeekNumber(r.date)}` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-3 text-right text-[12.5px] font-medium tabular-nums text-foreground">
                    {formatCurrency(r.amount, currency)}
                  </td>
                  <td
                    className="max-w-0 truncate px-2.5 py-3 pr-[26px] text-[13.5px] font-medium text-foreground"
                    title={r.description}
                  >
                    {r.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2.5 border-t border-border/60 bg-card px-[26px] py-3.5">
          <span className="flex-1 text-[12.5px] text-muted-foreground">
            {t("files.preview.showing", { shown: visible.length, total })}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] bg-muted px-3.5 py-[7px] text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-muted/80"
          >
            {t("files.close", "Close")}
          </button>
          <button
            type="button"
            onClick={handleOpenInTransactions}
            className="rounded-[10px] bg-primary px-3.5 py-[8px] text-[13px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {t("files.preview.openInTransactions", "Open in Transactions")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
