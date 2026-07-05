import * as React from "react";
import { cn } from "@/lib/utils";
import { AsteriskMark } from "./AsteriskMark";
import { Wordmark } from "./Wordmark";

type LogoProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "mark" | "wordmark" | "full";
  size?: number;
  gap?: string;
};

/**
 * Single source of truth for Pocket's brand lockup. Never hand-assemble
 * <img>+<span> at a call site — color comes from `className` (currentColor),
 * never a separate raster per color.
 */
export function Logo({ variant = "full", size = 24, gap = "gap-2", className, ...rest }: LogoProps) {
  if (variant === "mark") return <AsteriskMark size={size} className={className} {...rest} />;
  if (variant === "wordmark") return <Wordmark className={className} {...rest} />;

  return (
    <span className={cn("inline-flex items-center", gap, className)} {...rest}>
      <AsteriskMark size={size} />
      <Wordmark />
    </span>
  );
}
