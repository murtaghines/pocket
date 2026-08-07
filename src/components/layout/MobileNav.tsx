import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Home,
  TrendingUp,
  PiggyBank,
  Target,
  Database,
  BarChart3,
  User,
  LogOut,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AsteriskMark } from "@/components/brand/AsteriskMark";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface NavLink {
  label: string;
  path: string;
  icon: LucideIcon;
  match: string[];
}

interface NavGroup {
  label: string;
  items: NavLink[];
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation("common");
  const { signOut } = useAuth();

  const isActive = (match: string[]) =>
    match.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  const groups: NavGroup[] = [
    {
      label: t("navigation.analytics", "Analytics"),
      items: [
        { label: t("navigation.dashboard", "Dashboard"), path: "/dashboard", icon: Home, match: ["/dashboard"] },
        { label: t("navigation.history", "History"), path: "/history", icon: TrendingUp, match: ["/history"] },
      ],
    },
    {
      label: t("navigation.investments", "Investments"),
      items: [
        { label: t("navigation.investments", "Investments"), path: "/investments", icon: PiggyBank, match: ["/investments"] },
      ],
    },
    {
      label: t("navigation.planning", "Planning"),
      items: [
        { label: t("navigation.planning", "Planning"), path: "/planning", icon: Target, match: ["/planning"] },
      ],
    },
    {
      label: t("navigation.data", "Data"),
      items: [
        { label: t("navigation.bankStatements", "Bank statements"), path: "/my-data", icon: Database, match: ["/my-data"] },
        { label: t("navigation.investmentFiles", "Investment files"), path: "/my-data?tab=investments", icon: BarChart3, match: [] },
        { label: t("navigation.categoriesRules", "Categories & rules"), path: "/categories", icon: Tags, match: ["/categories"] },
      ],
    },
    {
      label: t("navigation.account", "Account"),
      items: [
        { label: t("navigation.account", "Account"), path: "/account", icon: User, match: ["/account", "/profile"] },
      ],
    },
  ];

  const isInvestmentFilesActive = location.pathname === "/my-data" && location.search.includes("tab=investments");

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-background/90 backdrop-blur-md border-b border-border md:hidden">
        <Link to="/dashboard" className="text-primary" aria-label="Home">
          <AsteriskMark size={26} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-10 h-10 -mr-1.5 rounded-lg text-foreground hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" strokeWidth={2} />
        </button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[280px] px-0 py-0 flex flex-col">
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          <nav className="flex-1 overflow-y-auto pt-14 pb-6 px-3">
            {groups.map((group) => (
              <div key={group.label} className="mb-5">
                <span className="block px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70">
                  {group.label}
                </span>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.path === "/my-data?tab=investments"
                        ? isInvestmentFilesActive
                        : item.path === "/my-data"
                          ? location.pathname === "/my-data" && !location.search.includes("tab=investments")
                          : isActive(item.match);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground")} strokeWidth={active ? 2 : 1.5} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-border px-3 py-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              {t("navigation.logout", "Log out")}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
