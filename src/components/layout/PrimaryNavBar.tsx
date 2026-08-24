import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, getActiveSection } from "@/config/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderUserMenu } from "./HeaderUserMenu";

export function PrimaryNavBar() {
  const location = useLocation();
  const { t } = useTranslation("common");
  const activeSection = getActiveSection(location.pathname);

  return (
    <div className="hidden md:flex items-center h-[58px] px-[26px] bg-primary">
      <Link to="/dashboard" aria-label="Pocket" className="flex items-center text-white shrink-0 mr-[28px]">
        <Logo variant="mark" size={21} />
      </Link>

      <nav className="flex items-center gap-[28px] h-full font-heading">
        {NAV_SECTIONS.map((section) => {
          const active = activeSection?.key === section.key;
          return (
            <Link
              key={section.key}
              to={section.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-[5px] h-full border-b-2 text-[15px] lowercase transition-colors duration-200",
                active
                  ? "border-white text-white font-bold"
                  : "border-transparent text-white/[.62] font-semibold hover:text-white/80",
              )}
            >
              {t(section.i18nKey)}
              {active && <ChevronDown className="w-[13px] h-[13px]" strokeWidth={2.5} />}
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
