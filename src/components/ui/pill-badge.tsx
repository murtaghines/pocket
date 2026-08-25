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
  neutral: "bg-[rgba(138,145,156,.14)] text-[#5A6270]",
  blue: "bg-[hsl(216_100%_94%)] text-[hsl(216_85%_38%)]",
  green: "bg-[rgba(46,158,107,.14)] text-[#217A49]",
  amber: "bg-[hsl(38_95%_92%)] text-[hsl(28_85%_38%)]",
  red: "bg-[rgba(224,112,74,.14)] text-[#C24A22]",
  purple: "bg-[hsl(265_70%_94%)] text-[hsl(265_55%_42%)]",
  teal: "bg-[hsl(180_60%_92%)] text-[hsl(180_55%_28%)]",
  yellow: "bg-[hsl(48_100%_90%)] text-[hsl(35_85%_32%)]",
  orange: "bg-[hsl(20_95%_92%)] text-[hsl(20_85%_38%)]",
};

// Solid (saturated) variant: strong fill, contrasting foreground.
// For yellow/amber the text stays dark brown to remain readable.
const TONE_CLASSES_SOLID: Record<PillTone, string> = {
  neutral: "bg-foreground/80 text-background",
  blue: "bg-[hsl(216_85%_52%)] text-white",
  green: "bg-[hsl(150_65%_38%)] text-white",
  amber: "bg-[hsl(45_100%_62%)] text-[hsl(35_90%_18%)]",
  red: "bg-[hsl(0_72%_52%)] text-white",
  purple: "bg-[hsl(265_60%_55%)] text-white",
  teal: "bg-[hsl(180_55%_38%)] text-white",
  yellow: "bg-[hsl(48_95%_55%)] text-[hsl(35_75%_18%)]",
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
        size === "sm" ? "px-[10px] py-[3px] text-xs gap-[6px]" : "px-2.5 py-1.5 text-sm gap-1.5",
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