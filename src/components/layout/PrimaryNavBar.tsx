import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, getActiveSection } from "@/config/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderUserMenu } from "./HeaderUserMenu";

export function PrimaryNavBar() {
  const location = useLocation();
  const { t } = useTranslation("common");
  const activeSection = getActiveSection(location.pathname);

  return (
    <div className="hidden md:flex items-center h-16 px-[28px] bg-accent">
      <Link to="/dashboard" aria-label="Pocket" className="flex items-center text-primary shrink-0 mr-8">
        <Logo variant="mark" size={22} />
      </Link>

      <nav className="flex items-center gap-2 h-full font-heading">
        {NAV_SECTIONS.map((section) => {
          const active = activeSection?.key === section.key;
          return (
            <Link
              key={section.key}
              to={section.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center h-full px-[18px] border-b-[2.5px] text-[14px] lowercase transition-colors duration-200",
                active
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-primary font-medium hover:opacity-80",
              )}
            >
              {t(section.i18nKey)}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto shrink-0">
        <HeaderUserMenu />
      </div>
    </div>
  );
}
