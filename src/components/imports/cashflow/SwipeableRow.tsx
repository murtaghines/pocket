import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface SwipeableRowProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}

const THRESHOLD = 70;
const MAX_DRAG = 100;

export function SwipeableRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = "Delete",
  rightLabel = "Edit",
  disabled,
}: SwipeableRowProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const locked = useRef(false);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    locked.current = false;
    setSwiping(false);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    if (!locked.current) {
      if (Math.abs(dy) > Math.abs(dx)) {
        locked.current = true;
        return;
      }
      if (Math.abs(dx) > 8) {
        setSwiping(true);
        locked.current = true;
      }
    }

    if (!swiping && !locked.current) return;
    if (locked.current && !swiping) return;

    // Only allow swipe left if onSwipeLeft is provided, same for right
    if (dx < 0 && !onSwipeLeft) return;
    if (dx > 0 && !onSwipeRight) return;

    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
    setOffset(clamped);
  };

  const handleTouchEnd = () => {
    if (!swiping) return;
    if (offset < -THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    } else if (offset > THRESHOLD && onSwipeRight) {
      onSwipeRight();
    }
    setOffset(0);
    setSwiping(false);
  };

  const progress = Math.abs(offset) / THRESHOLD;
  const committed = Math.abs(offset) >= THRESHOLD;

  return (
    <div className="relative overflow-hidden">
      {/* Left action background (swipe right → edit) */}
      {offset > 0 && onSwipeRight && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center pl-4 transition-colors",
            committed ? "bg-primary" : "bg-primary/80",
          )}
          style={{ width: Math.abs(offset) }}
        >
          <div
            className="flex items-center gap-1.5 text-primary-foreground"
            style={{ opacity: Math.min(1, progress) }}
          >
            <Pencil className="w-4 h-4" />
            <span className="text-xs font-medium">{rightLabel}</span>
          </div>
        </div>
      )}

      {/* Right action background (swipe left → delete) */}
      {offset < 0 && onSwipeLeft && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-colors",
            committed ? "bg-destructive" : "bg-destructive/80",
          )}
          style={{ width: Math.abs(offset) }}
        >
          <div
            className="flex items-center gap-1.5 text-destructive-foreground"
            style={{ opacity: Math.min(1, progress) }}
          >
            <span className="text-xs font-medium">{leftLabel}</span>
            <Trash2 className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Sliding content */}
      <div
        className={cn(!swiping && "transition-transform duration-200 ease-out")}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
