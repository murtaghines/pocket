import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  BarChart3,
  User,
  Plus,
  FileSpreadsheet,
  TrendingUp,
  Tags,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AsteriskMark } from "@/components/brand/AsteriskMark";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Shared mobile bottom navigation bar. Four destinations flank a central,
 * branded FAB (the Pocket asterisk) that morphs into a "+" on hover/press and
 * opens the "Add data" menu (bank statements, investments, categories & rules).
 * Used by DashboardLayout and any page (e.g. MyData) that needs mobile nav.
 */
export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [addOpen, setAddOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const items = [
    { label: t("navigation.dashboard", "Home"), path: "/dashboard", icon: LayoutDashboard },
    { label: t("navigation.history", "History"), path: "/history", icon: BarChart3 },
    { label: t("navigation.investments", "Invest"), path: "/investments", icon: PiggyBank },
    { label: t("navigation.account", "Account"), path: "/account", icon: User },
  ];

  const addActions = [
    {
      to: "/my-data?tab=bank",
      icon: FileSpreadsheet,
      label: t("addData.bankStatement", "Bank statement"),
      desc: t("addData.bankStatementDesc", "Upload a bank export to add transactions"),
    },
    {
      to: "/my-data?tab=investments",
      icon: TrendingUp,
      label: t("addData.investments", "Investments"),
      desc: t("addData.investmentsDesc", "Upload investment movements"),
    },
    {
      to: "/categories",
      icon: Tags,
      label: t("addData.categories", "Categories & rules"),
      desc: t("addData.categoriesDesc", "Edit categories and how transactions get sorted"),
    },
  ];

  const go = (to: string) => {
    setAddOpen(false);
    navigate(to);
  };

  const NavLink = ({ item }: { item: (typeof items)[number] }) => {
    const Icon = item.icon;
    const active = isActive(item.path.split("?")[0]);
    return (
      <Link
        to={item.path}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 flex-1 min-w-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-[10px] font-medium leading-none truncate max-w-full">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="relative bg-card border-t border-border">
          <div className="flex items-stretch h-14 px-1">
            <NavLink item={items[0]} />
            <NavLink item={items[1]} />
            {/* Gap that the central FAB sits over */}
            <div className="w-16 shrink-0" aria-hidden />
            <NavLink item={items[2]} />
            <NavLink item={items[3]} />
          </div>

          {/* Central branded FAB — Pocket asterisk that morphs to a + on hover/open */}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label={t("addData.title", "Add data")}
            className="group absolute left-1/2 -top-6 -translate-x-1/2 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background shadow-[0_8px_20px_-4px_hsl(216_100%_55%/0.5)] transition-transform active:scale-95"
          >
            <AsteriskMark
              size={24}
              className={cn(
                "absolute transition-all duration-200",
                addOpen
                  ? "scale-0 rotate-90 opacity-0"
                  : "opacity-100 group-hover:scale-0 group-hover:rotate-90 group-hover:opacity-0",
              )}
            />
            <Plus
              strokeWidth={2.5}
              className={cn(
                "absolute h-6 w-6 transition-all duration-200",
                addOpen
                  ? "scale-100 rotate-0 opacity-100"
                  : "scale-0 -rotate-90 opacity-0 group-hover:scale-100 group-hover:rotate-0 group-hover:opacity-100",
              )}
            />
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom,0)] bg-card" />
      </nav>

      {/* "Add data" menu */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl border-border">
          <SheetHeader className="text-left">
            <SheetTitle>{t("addData.title", "Add data")}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1.5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {addActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.to}
                  type="button"
                  onClick={() => go(a.to)}
                  className="flex items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60 active:bg-muted"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{a.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
