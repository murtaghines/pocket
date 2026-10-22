import { useUserPreferences, type DefaultPeriod } from "@/hooks/useUserPreferences";
import type { NavSection } from "@/config/navigation";

const PERIODS: DefaultPeriod[] = ["month", "week", "year"];
const DASHBOARD_TABS = [...PERIODS, "history"] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];

/** The dashboard view the user chose as their start screen (month unless they changed it). */
export function useDashboardDefaultTab(): DefaultPeriod {
  const { preferences } = useUserPreferences();
  const pref = preferences.default_period;
  return pref && PERIODS.includes(pref) ? pref : "month";
}

/** Default sub-tab for a nav section: the user's start screen for the dashboard, the section's own otherwise. */
export function useSectionDefaultTab(section: NavSection | undefined): string | undefined {
  const dashboardDefault = useDashboardDefaultTab();
  return section?.key === "dashboard" ? dashboardDefault : section?.defaultTab;
}

/** The active dashboard tab for the current `?tab=` — absent or invalid means the start screen. */
export function resolveDashboardTab(raw: string | null, defaultTab: DefaultPeriod): DashboardTab {
  return (DASHBOARD_TABS as readonly string[]).includes(raw ?? "") ? (raw as DashboardTab) : defaultTab;
}

/** Search params for switching tab: the start screen is the bare URL, everything else is explicit. */
export function withDashboardTab(params: URLSearchParams, tab: string, defaultTab: DefaultPeriod): URLSearchParams {
  const next = new URLSearchParams(params);
  if (tab === defaultTab) next.delete("tab");
  else next.set("tab", tab);
  return next;
}
