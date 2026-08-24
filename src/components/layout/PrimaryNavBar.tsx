import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, getActiveSection } from "@/config/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderUserMenu } from "./HeaderUserMenu";

interface PrimaryNavBarProps {
  subNavOpen: boolean;
  onToggleSubNav: () => void;
}

export function PrimaryNavBar({ subNavOpen, onToggleSubNav }: PrimaryNavBarProps) {
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
          const hasSubTabs = section.subTabs && section.subTabs.length > 1;
          return (
            <div
              key={section.key}
              className={cn(
                "flex items-center h-full border-b-2",
                active ? "border-white" : "border-transparent",
              )}
            >
              <Link
                to={section.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-[15px] lowercase transition-colors duration-200",
                  active
                    ? "text-white font-bold"
                    : "text-white/[.62] font-semibold hover:text-white/80",
                )}
              >
                {t(section.i18nKey)}
              </Link>
              {active && hasSubTabs && (
                <button
                  type="button"
                  onClick={onToggleSubNav}
                  aria-label={subNavOpen ? "Hide sub-navigation" : "Show sub-navigation"}
                  className="ml-[4px] p-0.5 text-white/80 hover:text-white transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "w-[13px] h-[13px] transition-transform duration-200",
                      !subNavOpen && "-rotate-90",
                    )}
                    strokeWidth={2.5}
                  />
                </button>
              )}
            </div>
          );
        })}
      </nav>

      <div className="ml-auto shrink-0">
        <HeaderUserMenu />
      </div>
    </div>
  );
}
