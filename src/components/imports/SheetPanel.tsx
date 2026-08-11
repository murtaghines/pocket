import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

/**
 * The bottom sheet every full-screen panel in the app is built from.
 *
 * Owns the things that must not drift between panels: the portal, the scrim,
 * the body scroll lock, and the slide-up/slide-down animation. Panels pass
 * their fields as `children` and their actions as `footer`.
 *
 * Animation note: the sheet has to be in the DOM at `translate-y-full` for one
 * committed frame before flipping to `translate-y-0`, or the browser has no
 * "from" value to interpolate and the sheet just appears. That's what the
 * mounted/shown split below is for — and why closing keeps it mounted until
 * the transition has run.
 */

const TRANSITION_MS = 320;

/** Shared sizing so every panel's fields line up. Pills are 44px — the
 *  smallest comfortable touch target — with type one step down from the
 *  page defaults. */
export const SHEET_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground";
export const SHEET_PILL =
  "h-11 rounded-full bg-muted border-0 shadow-none px-5 text-[13px]";
export const SHEET_BUTTON = "h-11 rounded-full font-semibold text-sm";
/** Free-text inputs keep 16px on mobile: anything smaller makes iOS Safari
 *  zoom the page on focus, which would fight the static-keyboard behaviour. */
export const SHEET_INPUT =
  "h-11 rounded-full bg-muted border-0 shadow-none px-5 text-base md:text-[13px] focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";

export interface SheetPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rendered lowercase and centered — position alone marks it as the title,
   *  so there's no rule under it. */
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra classes for the scrollable body. */
  bodyClassName?: string;
}

export function SheetPanel({
  open,
  onOpenChange,
  title,
  children,
  footer,
  bodyClassName,
}: SheetPanelProps) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useBodyScrollLock(mounted);

  // ─── Drag-to-dismiss (works from header AND body) ─────────────────
  const dragStartY = useRef(0);
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const DISMISS_THRESHOLD = 120;

  const handleHeaderDragStart = (e: TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragging.current = true;
  };
  const handleHeaderDragMove = (e: TouchEvent) => {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragY(dy);
  };
  const handleHeaderDragEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > DISMISS_THRESHOLD) {
      onOpenChange(false);
    }
    setDragY(0);
  };

  const handleBodyTouchStart = (e: TouchEvent) => {
    const el = bodyRef.current;
    if (!el || el.scrollTop > 0) return;
    dragStartY.current = e.touches[0].clientY;
    dragging.current = true;
  };
  const handleBodyTouchMove = (e: TouchEvent) => {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) {
      e.preventDefault();
      setDragY(dy);
    } else {
      dragging.current = false;
      setDragY(0);
    }
  };
  const handleBodyTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > DISMISS_THRESHOLD) {
      onOpenChange(false);
    }
    setDragY(0);
  };

  if (!mounted) return null;

  const panel = (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex flex-col bg-card shadow-lg",
          "rounded-t-3xl md:rounded-none",
          "top-[100px] md:top-0",
          !dragging.current && "transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-none",
          shown ? "translate-y-0" : "translate-y-full",
        )}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle + title — entire header is draggable */}
        <div
          className="cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleHeaderDragStart}
          onTouchMove={handleHeaderDragMove}
          onTouchEnd={handleHeaderDragEnd}
        >
          <div className="flex flex-col items-center pt-2 pb-1">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="px-4 pt-3 pb-5 text-center">
            <span className="text-[15px] font-title font-normal lowercase tracking-[0.04em] text-foreground">
              {title}
            </span>
          </div>
        </div>

        <div
          ref={bodyRef}
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain px-4 pb-5 space-y-5",
            bodyClassName,
          )}
          onTouchStart={handleBodyTouchStart}
          onTouchMove={handleBodyTouchMove}
          onTouchEnd={handleBodyTouchEnd}
        >
          {children}
        </div>

        {footer && <div className="px-4 pb-6 pt-3 space-y-2">{footer}</div>}
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
