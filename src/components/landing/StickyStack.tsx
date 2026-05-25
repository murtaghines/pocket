import { ReactNode } from "react";

interface StickyStackProps {
  children: ReactNode;
  /** Z-index so later sections sit above earlier ones */
  index: number;
  /** Optional className for the inner card (background, etc.) */
  className?: string;
}

/**
 * Wrapper used on the public landing to create a "stacked cards" scroll
 * effect: each section is sticky to the top of the viewport, so the next
 * one slides up and visually covers the previous one.
 */
export function StickyStack({ children, index, className = "" }: StickyStackProps) {
  return (
    <div
      className="sticky top-0"
      style={{ zIndex: index }}
    >
      <div
        className={`rounded-t-[2.5rem] overflow-hidden shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.18)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
