import * as React from "react";
import { cn } from "@/lib/utils";

type WordmarkProps = React.HTMLAttributes<HTMLSpanElement>;

/** "pocket" wordmark — Quicksand 700, lowercase, 0.07em tracking. Color via currentColor/className. */
export function Wordmark({ className, style, ...rest }: WordmarkProps) {
  return (
    <span
      style={{ fontFamily: "Quicksand, sans-serif", fontWeight: 700, ...style }}
      className={cn("tracking-[0.07em] lowercase", className)}
      {...rest}
    >
      pocket
    </span>
  );
}
