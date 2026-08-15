import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getActiveSection, getActiveTabKey } from "@/config/navigation";

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
    <div className="hidden md:flex items-center h-[42px] pl-[82px] pr-[28px] bg-primary font-heading">
      {section.subTabs.map((sub) => {
        const active = activeTab === sub.key;
        return (
          <Link
            key={sub.key}
            to={linkFor(sub.key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center h-full px-5 text-[13px] lowercase transition-colors duration-200",
              active
                ? "text-white font-extrabold"
                : "text-white/65 font-medium hover:bg-white/[0.08]",
            )}
          >
            {t(sub.i18nKey, { ns: sub.ns ?? "common" })}
          </Link>
        );
      })}
    </div>
  );
}
