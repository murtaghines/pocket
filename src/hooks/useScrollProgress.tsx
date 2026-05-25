import { useEffect, useRef, useState } from "react";

/**
 * Returns the scroll progress of `ref` through the viewport in the range
 * [-1, 1] approximately:
 *  -1  → element is just below the viewport
 *   0  → element is centered in the viewport
 *   1  → element has just scrolled above the viewport
 *
 * Respects `prefers-reduced-motion`: always returns 0.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !ref.current) return;

    let frame = 0;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when element center is centered, 1 when it has moved up by (height+vh)/2
      const center = rect.top + rect.height / 2;
      const p = (vh / 2 - center) / ((rect.height + vh) / 2);
      setProgress(Math.max(-1, Math.min(1, p)));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { ref, progress };
}
