import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { HeaderMonthSelector } from "./HeaderMonthSelector";
import { HeaderGranularitySelector } from "./HeaderGranularitySelector";

interface NavItem {
  label: string;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function HamburgerAsterisk({ open }: { open: boolean }) {
  const bars = [
    { closed: "translateY(-6px) rotate(90deg)", open: "rotate(0deg)" },
    { closed: "rotate(90deg)", open: "rotate(45deg)" },
    { closed: "rotate(90deg)", open: "rotate(90deg)" },
    { closed: "translateY(6px) rotate(90deg)", open: "rotate(135deg)" },
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
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

  const title = (() => {
    if (location.pathname === "/dashboard") return t("navigation.dashboard", "Dashboard");
    if (location.pathname.startsWith("/history")) return t("navigation.history", "History");
    if (location.pathname.startsWith("/investments")) return t("navigation.investments", "Investments");
    if (location.pathname.startsWith("/planning")) return t("navigation.planning", "Planning");
    if (location.pathname.startsWith("/my-data")) return t("navigation.dataUploads", "Data uploads");
    if (location.pathname.startsWith("/categories")) return t("navigation.categories", "Categories");
    if (location.pathname.startsWith("/account") || location.pathname.startsWith("/profile"))
      return t("navigation.account", "Account");
    return "";
  })();

  const groups: NavGroup[] = [
    {
      label: t("navigation.analytics", "Analytics"),
      items: [
        { label: t("navigation.dashboard", "Dashboard"), path: "/dashboard" },
        { label: t("navigation.history", "History"), path: "/history" },
      ],
    },
    {
      label: t("navigation.investments", "Investments"),
      items: [
        { label: t("navigation.investments", "Investments"), path: "/investments" },
      ],
    },
    {
      label: t("navigation.planning", "Planning"),
      items: [
        { label: t("navigation.planning", "Planning"), path: "/planning" },
      ],
    },
    {
      label: t("navigation.data", "Data"),
      items: [
        { label: t("navigation.bankStatements", "Bank statements"), path: "/my-data" },
        { label: t("navigation.investmentFiles", "Investment files"), path: "/my-data?tab=investments" },
        { label: t("navigation.categoriesRules", "Categories & rules"), path: "/categories" },
      ],
    },
    {
      label: t("navigation.account", "Account"),
      items: [
        { label: t("navigation.account", "Account"), path: "/account" },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === "/my-data?tab=investments") {
      return location.pathname === "/my-data" && location.search.includes("tab=investments");
    }
    if (path === "/my-data") {
      return location.pathname === "/my-data" && !location.search.includes("tab=investments");
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between h-12 px-4 bg-primary md:hidden">
        <span className="text-[15px] font-medium tracking-[-0.01em] lowercase text-primary-foreground">
          {title}
        </span>

        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "transition-opacity duration-200",
              open && "opacity-0 pointer-events-none",
            )}
          >
            <HeaderMonthSelector variant="onPrimary" />
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
          {groups.map((group, gi) => (
            <div
              key={group.label}
              className="mb-7"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(10px)",
                transition: `opacity 0.35s ease ${gi * 50 + 100}ms, transform 0.35s ease ${gi * 50 + 100}ms`,
              }}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground/30 mb-2.5">
                {group.label}
              </span>
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block py-[7px] text-[20px] font-light lowercase tracking-[-0.01em] transition-colors duration-200",
                      active
                        ? "text-primary-foreground"
                        : "text-primary-foreground/45 hover:text-primary-foreground/70",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div
          className="px-7 pb-10"
          style={{
            opacity: open ? 1 : 0,
            transition: "opacity 0.3s ease 350ms",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="text-[13px] lowercase text-primary-foreground/25 hover:text-primary-foreground/50 transition-colors"
          >
            {t("navigation.logout", "Log out")}
          </button>
        </div>
      </div>
    </>
  );
}
