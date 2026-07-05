import * as React from "react";
import { cn } from "@/lib/utils";

type AsteriskMarkProps = React.SVGProps<SVGSVGElement> & { size?: number };

/** 8-point asterisk — fill only, no stroke, matches brand spec. Color via currentColor. */
export function AsteriskMark({ size = 24, className, ...rest }: AsteriskMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...rest}
    >
      {[0, 45, 90, 135].map((deg) => (
        <rect
          key={deg}
          x="10.7"
          y="1.6"
          width="2.6"
          height="20.8"
          rx="1.3"
          fill="currentColor"
          transform={deg === 0 ? undefined : `rotate(${deg} 12 12)`}
        />
      ))}
    </svg>
  );
}
