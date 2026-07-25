import { useSearchParams } from "react-router-dom";
import type { Granularity } from "@/lib/analytics";

/**
 * History's Week/Month/Year granularity, persisted to the `?g=` search param so it survives a
 * refresh and can be driven from anywhere (the page body or the sticky top bar) via the same URL.
 */
export function useGranularity(): [Granularity, (g: Granularity) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const gParam = searchParams.get("g");
  const granularity: Granularity = gParam === "week" || gParam === "year" ? gParam : "month";
  const setGranularity = (g: Granularity) => {
    const next = new URLSearchParams(searchParams);
    if (g === "month") next.delete("g");
    else next.set("g", g);
    setSearchParams(next, { replace: true });
  };
  return [granularity, setGranularity];
}
