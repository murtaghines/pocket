import { useRef } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
}

export function MonthTabStrip({
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

  const activeIdx = slots.findIndex((s) => s.key === activeKey);
  const activeSlot = slots[activeIdx];
  const activeImports = importsByMonth[activeKey] || [];
  const activeTxCount = activeImports.reduce((s, i) => s + (i.transactions_count || 0), 0);

  const goPrev = () => {
    if (activeIdx < slots.length - 1) onActivate(slots[activeIdx + 1].key);
    else onLoadMore();
  };
  const goNext = () => {
    if (activeIdx > 0) onActivate(slots[activeIdx - 1].key);
  };

  return (
    <>
      {/* Mobile: simple month navigator — sticky below the header */}
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
          <span className="text-[15px] font-semibold text-foreground uppercase">
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

      {/* Desktop: full Airtable-style tab strip */}
      <div className="hidden md:flex items-stretch border-b border-border bg-primary/5 relative">
        <div
          ref={scrollRef}
          className="flex-1 flex items-stretch overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {slots.map((slot) => {
            const active = slot.key === activeKey;
            const imps = importsByMonth[slot.key] || [];
            const hasData = imps.length > 0;
            const txCount = imps.reduce((sum, i) => sum + (i.transactions_count || 0), 0);
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => onActivate(slot.key)}
                className={cn(
                  "group relative flex items-center gap-2 px-5 py-2.5 text-sm whitespace-nowrap transition-all border-r border-border/40",
                  active
                    ? "bg-card text-foreground font-semibold -mb-px border-b-card z-10"
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
                    {txCount}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-0.5 px-2 border-l border-border/40">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-7 text-muted-foreground hover:text-foreground hover:bg-card"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll tabs left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-7 text-muted-foreground hover:text-foreground hover:bg-card"
            onClick={() => scrollBy(1)}
            aria-label="Scroll tabs right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {canShowLess && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-card"
              onClick={onShowLess}
              title="Show fewer months"
              aria-label="Show fewer months"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-card"
            onClick={onLoadMore}
            title="Show one older month"
            aria-label="Show one older month"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
