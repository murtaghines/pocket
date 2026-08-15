import { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { HeaderMonthSelector } from "./HeaderMonthSelector";
import { HeaderWeekSelector } from "./HeaderWeekSelector";
import { HeaderYearSelector } from "./HeaderYearSelector";
import { HeaderGranularitySelector } from "./HeaderGranularitySelector";
import { NAV_SECTIONS, getActiveSection, getActiveTabKey } from "@/config/navigation";

function HamburgerAsterisk({ open }: { open: boolean }) {
  const bars = [
    { closed: "translateY(-7px) rotate(90deg)", open: "rotate(0deg)" },
    { closed: "translateY(-2.3px) rotate(90deg)", open: "rotate(45deg)" },
    { closed: "translateY(2.3px) rotate(90deg)", open: "rotate(90deg)" },
    { closed: "translateY(7px) rotate(90deg)", open: "rotate(135deg)" },
  ];

  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      {bars.map((bar, i) => (
        <rect
          key={i}
          x="10.7"
          y="3"
          width="2.6"
          height="18"
          rx="1.3"
          fill="currentColor"
          style={{
            transformOrigin: "12px 12px",
            transform: open ? bar.open : bar.closed,
            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      ))}
    </svg>
  );
}

const THEME_COLOR_BLUE = "#1B76FF";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("common");
  const { signOut } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Set iOS status bar to match blue header
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLOR_BLUE;
    return () => {
      if (meta) meta.content = "";
    };
  }, []);

  const activeSection = getActiveSection(location.pathname);
  const activeTabKey = getActiveTabKey(activeSection, searchParams);

  const title = (() => {
    if (activeSection) {
      if (activeTabKey && activeSection.subTabs) {
        const sub = activeSection.subTabs.find((s) => s.key === activeTabKey);
        if (sub) return t(sub.i18nKey, { ns: sub.ns ?? "common" });
      }
      return t(activeSection.i18nKey);
    }
    if (location.pathname.startsWith("/account") || location.pathname.startsWith("/profile"))
      return t("navigation.account", "Account");
    return "";
  })();

  const linkFor = (section: (typeof NAV_SECTIONS)[number], tabKey?: string) => {
    if (!tabKey || tabKey === section.defaultTab) return section.path;
    return `${section.path}?tab=${tabKey}`;
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between h-12 px-4 bg-primary md:hidden">
        <div className="relative h-full flex items-center overflow-hidden">
          {/* Page title — visible when closed */}
          <span
            className={cn(
              "font-title text-[15px] font-medium tracking-[0.05em] lowercase text-primary-foreground transition-all duration-300",
              open ? "opacity-0 -translate-y-3" : "opacity-100 translate-y-0",
            )}
          >
            {title}
          </span>
          {/* "pocket" wordmark — visible when open */}
          <span
            className={cn(
              "absolute left-0 text-[15px] font-medium tracking-[-0.01em] lowercase text-primary-foreground transition-all duration-300",
              open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
            )}
          >
            pocket
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "transition-opacity duration-200",
              open && "opacity-0 pointer-events-none",
            )}
          >
            <HeaderMonthSelector variant="onPrimary" />
            <HeaderWeekSelector variant="onPrimary" />
            <HeaderYearSelector variant="onPrimary" />
            <HeaderGranularitySelector variant="onPrimary" />
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center w-10 h-10 -mr-2 text-primary-foreground"
            aria-label={open ? t("close") : "Menu"}
          >
            <HamburgerAsterisk open={open} />
          </button>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-primary md:hidden",
          "transition-all duration-300 ease-out",
          open ? "opacity-100 visible" : "opacity-0 invisible",
        )}
        style={{ paddingTop: 48 }}
      >
        <nav className="flex-1 overflow-y-auto px-7 pt-8 pb-6">
          {NAV_SECTIONS.map((section, gi) => (
            <div
              key={section.key}
              className="mb-7"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(10px)",
                transition: `opacity 0.35s ease ${gi * 50 + 100}ms, transform 0.35s ease ${gi * 50 + 100}ms`,
              }}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/30 mb-2.5">
                {t(section.i18nKey)}
              </span>
              {section.subTabs && section.subTabs.length > 0 ? (
                section.subTabs.map((sub) => {
                  const active = activeSection?.key === section.key && activeTabKey === sub.key;
                  return (
                    <Link
                      key={sub.key}
                      to={linkFor(section, sub.key)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block py-[7px] text-[20px] font-light lowercase tracking-[-0.01em] transition-colors duration-200",
                        active
                          ? "text-primary-foreground"
                          : "text-primary-foreground/45 hover:text-primary-foreground/70",
                      )}
                    >
                      {t(sub.i18nKey, { ns: sub.ns ?? "common" })}
                    </Link>
                  );
                })
              ) : (
                <Link
                  to={section.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block py-[7px] text-[20px] font-light lowercase tracking-[-0.01em] transition-colors duration-200",
                    activeSection?.key === section.key
                      ? "text-primary-foreground"
                      : "text-primary-foreground/45 hover:text-primary-foreground/70",
                  )}
                >
                  {t(section.i18nKey)}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom bar — account · settings · log out */}
        <div
          className="px-7 pb-10 flex items-center gap-2 text-[13px] lowercase"
          style={{
            opacity: open ? 1 : 0,
            transition: "opacity 0.3s ease 350ms",
          }}
        >
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="text-primary-foreground/35 hover:text-primary-foreground/60 transition-colors"
          >
            {t("navigation.account", "account")}
          </Link>
          <span className="text-primary-foreground/20">·</span>
          <Link
            to="/account?tab=preferences"
            onClick={() => setOpen(false)}
            className="text-primary-foreground/35 hover:text-primary-foreground/60 transition-colors"
          >
            {t("navigation.settings", "settings")}
          </Link>
          <span className="text-primary-foreground/20">·</span>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="text-primary-foreground/25 hover:text-primary-foreground/50 transition-colors"
          >
            {t("navigation.logout", "log out")}
          </button>
        </div>
      </div>
    </>
  );
}
