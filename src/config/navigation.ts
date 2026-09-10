import { House, CalendarDays, PiggyBank, Target, Wallet, Database, type LucideIcon } from "lucide-react";

export interface NavSubTab {
  /** Value used in the `?tab=` search param. */
  key: string;
  /** i18n key for the label. */
  i18nKey: string;
  /** i18next namespace the label lives in — defaults to "common". */
  ns?: string;
}

export interface NavSection {
  key: string;
  /** Canonical path this section links to. */
  path: string;
  i18nKey: string;
  icon: LucideIcon;
  /** Route prefixes that keep this section active (includes legacy pre-redirect paths). */
  match: string[];
  subTabs?: NavSubTab[];
  /** Sub-tab key that's the default — omitted from the `?tab=` URL. */
  defaultTab?: string;
}

/**
 * Single source of truth for the app's top-level navigation: the primary bar's 6 sections and
 * each one's secondary-bar sub-tabs. Consumed by PrimaryNavBar, SecondaryNavBar and MobileNav so
 * there's exactly one place that knows the site's information architecture.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "dashboard",
    path: "/dashboard",
    i18nKey: "navigation.dashboard",
    icon: House,
    match: ["/dashboard", "/history"],
    defaultTab: "month",
    subTabs: [
      { key: "month", i18nKey: "granularity.month", ns: "dashboard" },
      { key: "week", i18nKey: "granularity.week", ns: "dashboard" },
      { key: "year", i18nKey: "granularity.year", ns: "dashboard" },
      { key: "history", i18nKey: "navigation.tabs.dashboard.history" },
    ],
  },
  {
    key: "calendar",
    path: "/calendar",
    i18nKey: "navigation.calendar",
    icon: CalendarDays,
    match: ["/calendar"],
  },
  {
    key: "investments",
    path: "/investments",
    i18nKey: "navigation.investments",
    icon: PiggyBank,
    match: ["/investments"],
  },
  {
    key: "planning",
    path: "/planning",
    i18nKey: "navigation.planning",
    icon: Target,
    match: ["/planning"],
  },
  {
    key: "budgets",
    path: "/budgets",
    i18nKey: "navigation.budgets",
    icon: Wallet,
    match: ["/budgets"],
  },
  {
    key: "data",
    path: "/my-data",
    i18nKey: "navigation.data",
    icon: Database,
    match: ["/my-data", "/categories"],
    defaultTab: "transactions",
    subTabs: [
      { key: "transactions", i18nKey: "navigation.tabs.data.transactions" },
      { key: "investments", i18nKey: "navigation.tabs.data.investments" },
      { key: "categories", i18nKey: "navigation.tabs.data.categories" },
      { key: "accounts", i18nKey: "navigation.tabs.data.accounts" },
    ],
  },
];

/** The section whose `match` prefixes cover the given pathname, if any. */
export function getActiveSection(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.find((s) =>
    s.match.some((p) => pathname === p || pathname.startsWith(p + "/")),
  );
}

/**
 * The active sub-tab key for a section given the current `?tab=` param — whitelist-checked, falls
 * back to the section's default tab. Returns undefined for sections without sub-tabs.
 */
export function getActiveTabKey(
  section: NavSection | undefined,
  searchParams: URLSearchParams,
): string | undefined {
  if (!section?.subTabs?.length || !section.defaultTab) return undefined;
  const raw = searchParams.get("tab");
  if (raw && section.subTabs.some((t) => t.key === raw)) return raw;
  return section.defaultTab;
}
