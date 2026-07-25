import { useLocation } from "react-router-dom";
import { GranularityToggle } from "@/components/dashboard/GranularityToggle";
import { useGranularity } from "@/hooks/useGranularity";

/** The History Week/Month/Year toggle, pinned into the sticky top bar (desktop). */
export function HeaderGranularitySelector() {
  const location = useLocation();
  const [granularity, setGranularity] = useGranularity();

  if (location.pathname !== "/history") return null;

  return <GranularityToggle value={granularity} onChange={setGranularity} />;
}
