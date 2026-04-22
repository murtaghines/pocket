import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Soft "pill" badge inspired by Airtable single-select cells.
 * Use semantic `tone` for built-in palettes, or `style` with custom HSL when
 * driving from category color tokens.
 */

export type PillTone =
  | "neutral"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "teal"
  | "yellow"
  | "orange";

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: "bg-muted text-foreground/80",
  blue: "bg-[hsl(216_100%_94%)] text-[hsl(216_85%_38%)]",
  green: "bg-[hsl(150_60%_92%)] text-[hsl(150_70%_28%)]",
  amber: "bg-[hsl(38_95%_92%)] text-[hsl(28_85%_38%)]",
  red: "bg-[hsl(0_85%_95%)] text-[hsl(0_70%_42%)]",
  purple: "bg-[hsl(265_70%_94%)] text-[hsl(265_55%_42%)]",
  teal: "bg-[hsl(180_60%_92%)] text-[hsl(180_55%_28%)]",
  yellow: "bg-[hsl(48_100%_90%)] text-[hsl(35_85%_32%)]",
  orange: "bg-[hsl(20_95%_92%)] text-[hsl(20_85%_38%)]",
};

export interface PillBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  /** When provided, overrides tone with a custom HSL color (background + foreground). */
  hsl?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export function PillBadge({
  className,
  tone = "neutral",
  hsl,
  size = "sm",
  icon,
  children,
  style,
  ...props
}: PillBadgeProps) {
  const customStyle = hsl
    ? {
        backgroundColor: `hsl(${hsl} / 0.14)`,
        color: `hsl(${hsl})`,
        ...style,
      }
    : style;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium leading-none whitespace-nowrap",
        size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
        !hsl && TONE_CLASSES[tone],
        className,
      )}
      style={customStyle}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}