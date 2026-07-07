import { History, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FIELD_LABELS, formatAuditValue, formatRelativeTime } from "./helpers";
import type { AuditEntry } from "./types";

export interface RowEditIndicatorProps {
  index: number;
  history: AuditEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevert: (entry: AuditEntry) => void;
  formatCurrency: (n: number) => string;
  getCategoryLabel: (slug: string) => string;
}
export function RowEditIndicator({
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
    return <span className="flex w-full justify-center text-center">{index}</span>;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-6 w-full items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
          title={`${editEntries.length} change${editEntries.length === 1 ? "" : "s"} — click to review`}
        >
          <span className="relative flex w-2 h-2 rounded-full bg-primary" aria-hidden>
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
            Changes
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {editEntries.length}
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
                    title="Undo this change"
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
      </PopoverContent>
    </Popover>
  );
}
