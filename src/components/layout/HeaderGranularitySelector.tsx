import { useLocation } from "react-router-dom";
import { GranularityToggle } from "@/components/dashboard/GranularityToggle";
import { useGranularity } from "@/hooks/useGranularity";

interface HeaderGranularitySelectorProps {
  variant?: "default" | "onPrimary";
}

export function HeaderGranularitySelector({ variant = "default" }: HeaderGranularitySelectorProps) {
  const location = useLocation();
  const [granularity, setGranularity] = useGranularity();

  if (location.pathname !== "/history") return null;

  return <GranularityToggle value={granularity} onChange={setGranularity} variant={variant} />;
}
