import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, getActiveSection } from "@/config/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderUserMenu } from "./HeaderUserMenu";

/**
 * Desktop primary navigation — a full-width solid-blue bar with the 4 top-level sections
 * (dashboard / investments / planning / data), the brand mark on the left, and the
 * notifications/theme/user cluster on the right. Sits above SecondaryNavBar, which renders the
 * active section's sub-tabs.
 */
export function PrimaryNavBar() {
  const location = useLocation();
  const { t } = useTranslation("common");
  const activeSection = getActiveSection(location.pathname);

  return (
    <div className="hidden md:flex items-center justify-between h-14 px-[30px] bg-primary">
      <Link to="/dashboard" aria-label="Pocket" className="flex items-center text-primary-foreground shrink-0">
        <Logo variant="mark" size={22} />
      </Link>

      <nav className="flex items-center gap-1">
        {NAV_SECTIONS.map((section) => {
          const active = activeSection?.key === section.key;
          return (
            <Link
              key={section.key}
              to={section.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-[13.5px] font-medium lowercase transition-colors duration-200",
                active
                  ? "bg-white/[0.20] text-white"
                  : "text-white/65 hover:text-white",
              )}
            >
              {t(section.i18nKey)}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0">
        <HeaderUserMenu onPrimary />
      </div>
    </div>
  );
}
