import { useEffect, useState, type ReactNode } from "react";
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

  if (!mounted) return null;

  const panel = (
    <>
      {/* Scrim — the month behind stays visible so the sheet reads as
          sitting on top of the page rather than replacing it. */}
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
          // Leave the mobile nav (48px) + month tab strip (~52px) uncovered
          "top-[100px] md:top-0",
          // iOS sheet easing: quick to leave the bottom, settles gently.
          "transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-none",
          shown ? "translate-y-0" : "translate-y-full",
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-4 py-3.5 text-center">
          <span className="text-[15px] font-semibold lowercase text-foreground">
            {title}
          </span>
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain px-4 pb-5 space-y-4",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer && <div className="px-4 pb-6 pt-3 space-y-2">{footer}</div>}
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
