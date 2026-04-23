import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, Plus, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useImports, type Import } from "@/hooks/useImports";
import { useMonthlyInvestmentUpload } from "@/hooks/useMonthlyInvestmentUpload";
import { useLocalization } from "@/hooks/useLocalization";
import { MonthUploadSlot } from "./MonthUploadSlot";

const VALID_EXTS = [".xlsx", ".xls", ".csv", ".pdf"];
const DEFAULT_MONTHS = 6;
const MONTHS_INCREMENT = 6;

/**
 * Investment-side equivalent of BankStatementsTabsView — same Airtable-style
 * month tab strip; active tab reveals the month's upload workspace.
 */
export function InvestmentTabsView() {
  const { formatMonth } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting } = useImports("INVESTING");
  const {
    addFilesForMonth,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
  } = useMonthlyInvestmentUpload();

  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS);

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

  const [activeKey, setActiveKey] = useState<string>(() => monthSlots[0]?.key ?? "");
  useEffect(() => {
    if (!activeKey && monthSlots[0]) setActiveKey(monthSlots[0].key);
  }, [monthSlots, activeKey]);

  const activeSlot = monthSlots.find((s) => s.key === activeKey) ?? monthSlots[0];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {activeSlot && (
        <div
          className="rounded-xl border border-border bg-card p-3 md:p-4"
          style={{ boxShadow: "var(--shadow-section)" }}
        >
          <MonthUploadSlot
            monthKey={activeSlot.key}
            monthLabel={activeSlot.label}
            monthDate={activeSlot.date}
            imports={importsByMonth[activeSlot.key] || []}
            onAddFiles={addFilesForMonth}
            onProcessFiles={processFilesForMonth}
            onDeleteImport={deleteImport}
            isProcessing={isProcessingMonth(activeSlot.key)}
            hasPendingFiles={getPendingCountForMonth(activeSlot.key) > 0}
            pendingFilesCount={getPendingCountForMonth(activeSlot.key)}
            isDeleting={isDeleting}
          />
        </div>
      )}
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
      <div className="flex items-stretch gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-8 shrink-0 self-end text-muted-foreground hover:text-foreground"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div
          ref={scrollRef}
          className="flex-1 flex items-stretch overflow-x-auto scrollbar-none bg-primary/5 rounded-t-xl"
          style={{ scrollbarWidth: "none" }}
        >
          {slots.map((slot, idx) => {
            const active = slot.key === activeKey;
            const imports = importsByMonth[slot.key] || [];
            const hasData = imports.length > 0;
            const fileCount = imports.length;
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => onActivate(slot.key)}
                className={cn(
                  "group relative flex items-center gap-2 px-5 py-3 text-sm whitespace-nowrap transition-all",
                  idx === 0 && "rounded-tl-xl",
                  active
                    ? "bg-card text-foreground font-semibold rounded-t-xl shadow-[0_-1px_0_0_hsl(var(--border)),1px_0_0_0_hsl(var(--border)),-1px_0_0_0_hsl(var(--border))] z-10"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/10",
                )}
              >
                <span className="capitalize">{slot.label}</span>
                {hasData ? (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
                      active ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary/70",
                    )}
                  >
                    {fileCount}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                )}
              </button>
            );
          })}

          <div className="flex items-center gap-1 px-2 ml-auto self-center">
            {canShowLess && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:bg-card"
                onClick={onShowLess}
                title="Show fewer months"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground gap-1 hover:bg-card"
              onClick={onLoadMore}
              title="Show older months"
            >
              <Plus className="w-3.5 h-3.5" />
              Older
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-8 shrink-0 self-end text-muted-foreground hover:text-foreground"
          onClick={() => scrollBy(1)}
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="h-px bg-border -mt-px" />
    </div>
  );
}