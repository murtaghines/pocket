import { useRef, useState, useCallback, type ReactNode, type TouchEvent, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, EyeOff } from "lucide-react";

interface SwipeableRowProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** "delete" (red, trash) | "hide" (grey, eye-off) */
  leftAction?: "delete" | "hide";
  disabled?: boolean;
}

const REVEAL_W = 72;
const AUTO_TRIGGER_W = 140;

export function SwipeableRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = "delete",
  disabled,
}: SwipeableRowProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const [offset, setOffset] = useState(0);
  const startOffset = useRef(0);
  const tracking = useRef(false);
  const dirLocked = useRef<"x" | "y" | null>(null);
  const didSwipe = useRef(false);

  const reset = useCallback(() => {
    setOffset(0);
    tracking.current = false;
    dirLocked.current = null;
  }, []);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startOffset.current = offset;
    dirLocked.current = null;
    tracking.current = true;
    didSwipe.current = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || !tracking.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    if (!dirLocked.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
        dirLocked.current = "y";
        return;
      }
      if (Math.abs(dx) > 8) {
        dirLocked.current = "x";
        didSwipe.current = true;
      } else return;
    }
    if (dirLocked.current !== "x") return;

    const rawOffset = startOffset.current + dx;

    if (startOffset.current > 0 && rawOffset < 0) { setOffset(0); return; }
    if (startOffset.current < 0 && rawOffset > 0) { setOffset(0); return; }

    if (rawOffset < 0 && !onSwipeLeft) return;
    if (rawOffset > 0 && !onSwipeRight) return;

    const max = AUTO_TRIGGER_W + 20;
    const clamped = Math.max(-max, Math.min(max, rawOffset));
    setOffset(clamped);
  };

  const handleTouchEnd = () => {
    if (!tracking.current) return;
    if (Math.abs(offset) >= AUTO_TRIGGER_W) {
      if (offset < 0 && onSwipeLeft) onSwipeLeft();
      else if (offset > 0 && onSwipeRight) onSwipeRight();
      reset();
      return;
    }
    if (offset < -REVEAL_W / 2 && onSwipeLeft) {
      setOffset(-REVEAL_W);
      tracking.current = false;
      dirLocked.current = null;
    } else if (offset > REVEAL_W / 2 && onSwipeRight) {
      setOffset(REVEAL_W);
      tracking.current = false;
      dirLocked.current = null;
    } else {
      reset();
    }
  };

  const handleContentClick = (e: MouseEvent) => {
    if (didSwipe.current) {
      e.stopPropagation();
      didSwipe.current = false;
      return;
    }
    if (Math.abs(offset) > 0) {
      e.stopPropagation();
      reset();
    }
  };

  const leftBg = leftAction === "hide" ? "bg-muted-foreground" : "bg-destructive";
  const LeftIcon = leftAction === "hide" ? EyeOff : Trash2;

  return (
    <div className="relative overflow-hidden">
      {offset > 0 && onSwipeRight && (
        <div className="absolute inset-y-0 left-0 flex items-center justify-center bg-primary" style={{ width: Math.abs(offset) }}>
          <button
            type="button"
            className="flex h-full w-full items-center justify-center"
            onClick={() => { onSwipeRight(); reset(); }}
            aria-label="Edit"
          >
            <Pencil className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      )}

      {offset < 0 && onSwipeLeft && (
        <div className={cn("absolute inset-y-0 right-0 flex items-center justify-center", leftBg)} style={{ width: Math.abs(offset) }}>
          <button
            type="button"
            className="flex h-full w-full items-center justify-center"
            onClick={() => { onSwipeLeft(); reset(); }}
            aria-label={leftAction === "hide" ? "Hide" : "Delete"}
          >
            <LeftIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      <div
        className={cn(
          !tracking.current && dirLocked.current !== "x" && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
