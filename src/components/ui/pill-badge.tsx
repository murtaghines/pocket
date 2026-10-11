import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Soft "pill" badge inspired by Airtable single-select cells.
 * Use semantic `tone` for built-in palettes, or `style` with custom HSL when
 * driving from category color tokens.
 */

export type PillVariant = "soft" | "solid";

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
  neutral: "bg-muted-foreground/[0.14] text-muted-foreground",
  blue: "bg-primary/[0.12] text-primary",
  green: "bg-success/[0.14] text-success",
  amber: "bg-warning/[0.14] text-warning",
  red: "bg-destructive/[0.14] text-destructive",
  purple: "bg-[hsl(265_70%_94%)] text-[hsl(265_55%_42%)]",
  teal: "bg-[hsl(180_60%_92%)] text-[hsl(180_55%_28%)]",
  yellow: "bg-warning/[0.14] text-[hsl(35_85%_32%)]",
  orange: "bg-[hsl(20_95%_92%)] text-[hsl(20_85%_38%)]",
};

// Solid (saturated) variant: strong fill, contrasting foreground.
// For yellow/amber the text stays dark brown to remain readable.
const TONE_CLASSES_SOLID: Record<PillTone, string> = {
  neutral: "bg-foreground/80 text-background",
  blue: "bg-primary text-primary-foreground",
  green: "bg-success text-success-foreground",
  amber: "bg-warning text-warning-foreground",
  red: "bg-destructive text-destructive-foreground",
  purple: "bg-[hsl(265_60%_55%)] text-white",
  teal: "bg-[hsl(180_55%_38%)] text-white",
  yellow: "bg-warning text-warning-foreground",
  orange: "bg-[hsl(20_85%_52%)] text-white",
};

export interface PillBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  variant?: PillVariant;
  /** When provided, overrides tone with a custom HSL color (background + foreground). */
  hsl?: string;
  /** When provided, overrides tone using a CSS variable name (e.g. "category-salary"). */
  colorVar?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export function PillBadge({
  className,
  tone = "neutral",
  variant = "soft",
  hsl,
  colorVar,
  size = "sm",
  icon,
  children,
  style,
  ...props
}: PillBadgeProps) {
  // For "soft" custom-color pills, we want a very light background of the
  // category color but keep the icon/label readable. Text uses a darker
  // foreground while the icon keeps the saturated category color.
  const softBgAlpha = 0.13;
  const customStyle = colorVar
    ? variant === "solid"
      ? {
          backgroundColor: `hsl(var(--${colorVar}))`,
          color: "hsl(var(--primary-foreground))",
          ...style,
        }
      : {
          backgroundColor: `hsl(var(--${colorVar}) / ${softBgAlpha})`,
          color: `hsl(var(--${colorVar}))`,
          ...style,
        }
    : hsl
    ? variant === "solid"
      ? {
          backgroundColor: `hsl(${hsl})`,
          color: "hsl(var(--primary-foreground))",
          ...style,
        }
      : {
          backgroundColor: `hsl(${hsl} / ${softBgAlpha})`,
          color: `hsl(${hsl})`,
          ...style,
        }
    : style;

  const useCustom = !!(colorVar || hsl);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium leading-none whitespace-nowrap",
        size === "sm" ? "px-[8px] py-[2px] text-xs gap-[5px]" : "px-2.5 py-1.5 text-sm gap-1.5",
        !useCustom && (variant === "solid" ? TONE_CLASSES_SOLID[tone] : TONE_CLASSES[tone]),
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