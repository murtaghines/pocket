import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Import } from "@/hooks/useImports";

export interface MonthTabStripProps {
  slots: { key: string; label: string; date: Date }[];
  activeKey: string;
  onActivate: (k: string) => void;
  importsByMonth: Record<string, Import[]>;
  onLoadMore: () => void;
  onShowLess: () => void;
  canShowLess: boolean;
  activeTxCount?: number;
}

export function MonthTabStrip({
  slots,
  activeKey,
  onActivate,
  importsByMonth,
  onLoadMore,
  activeTxCount: activeTxCountProp,
}: MonthTabStripProps) {
  const activeIdx = slots.findIndex((s) => s.key === activeKey);
  const activeSlot = slots[activeIdx];
  const activeImports = importsByMonth[activeKey] || [];
  const importsTxCount = activeImports.reduce((s, i) => s + (i.transactions_count || 0), 0);
  const activeTxCount = activeTxCountProp ?? importsTxCount;

  const goPrev = () => {
    if (activeIdx < slots.length - 1) onActivate(slots[activeIdx + 1].key);
    else onLoadMore();
  };
  const goNext = () => {
    if (activeIdx > 0) onActivate(slots[activeIdx - 1].key);
  };

  return (
    <div className="md:hidden sticky top-12 z-20 flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={goPrev}
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-foreground uppercase">
          {activeSlot?.label}
        </span>
        {activeTxCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums bg-primary/15 text-primary">
            {activeTxCount}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={goNext}
        disabled={activeIdx <= 0}
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
