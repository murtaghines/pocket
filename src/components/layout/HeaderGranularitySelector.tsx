import { useLocation, useSearchParams } from "react-router-dom";
import { GranularityToggle } from "@/components/dashboard/GranularityToggle";
import { useGranularity } from "@/hooks/useGranularity";
import { getActiveSection, getActiveTabKey } from "@/config/navigation";

interface HeaderGranularitySelectorProps {
  variant?: "default" | "onPrimary";
}

export function HeaderGranularitySelector({ variant = "default" }: HeaderGranularitySelectorProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [granularity, setGranularity] = useGranularity();

  const section = getActiveSection(location.pathname);
  const activeTab = getActiveTabKey(section, searchParams);
  if (section?.key !== "dashboard" || activeTab !== "history") return null;

  return <GranularityToggle value={granularity} onChange={setGranularity} variant={variant} />;
}
