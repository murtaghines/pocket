import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getActiveSection, getActiveTabKey } from "@/config/navigation";

/**
 * Desktop secondary navigation — a lighter-blue bar directly under PrimaryNavBar showing the
 * active section's sub-tabs (e.g. dashboard: month/week/year/history). Reads/writes `?tab=`
 * following the same whitelist + default-tab-omits-param convention as `Account.tsx`. Renders
 * nothing when the active section has one or zero sub-tabs (e.g. Investments).
 */
export function SecondaryNavBar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation(["common", "dashboard"]);
  const section = getActiveSection(location.pathname);

  if (!section?.subTabs || section.subTabs.length <= 1) return null;

  const activeTab = getActiveTabKey(section, searchParams);

  const linkFor = (tabKey: string) => {
    const params = new URLSearchParams(searchParams);
    if (tabKey === section.defaultTab) params.delete("tab");
    else params.set("tab", tabKey);
    const qs = params.toString();
    return `${section.path}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="hidden md:flex items-center gap-1 h-10 px-[30px] bg-primary-tint">
      {section.subTabs.map((sub) => {
        const active = activeTab === sub.key;
        return (
          <Link
            key={sub.key}
            to={linkFor(sub.key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12.5px] lowercase transition-colors duration-200",
              active
                ? "font-semibold text-primary-tint-foreground"
                : "font-medium text-primary-tint-foreground/60 hover:text-primary-tint-foreground/85",
            )}
          >
            {t(sub.i18nKey, { ns: sub.ns ?? "common" })}
          </Link>
        );
      })}
    </div>
  );
}
