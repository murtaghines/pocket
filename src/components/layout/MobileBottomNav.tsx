import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  BarChart3,
  Target,
  FileSpreadsheet,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Shared mobile bottom navigation bar. Used by DashboardLayout and any
 * page (e.g. MyData) that opts out of DashboardLayout but still needs nav.
 */
export function MobileBottomNav() {
  const location = useLocation();
  const { t } = useTranslation("common");

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const items = [
    { label: t("navigation.dashboard", "Home"), path: "/dashboard", icon: LayoutDashboard },
    { label: t("navigation.history", "History"), path: "/history", icon: BarChart3 },
    { label: t("navigation.investments", "Invest"), path: "/investments", icon: PiggyBank },
    { label: "Plan", path: "/planning/budgets", icon: Target },
    { label: "Data", path: "/my-data?tab=bank", icon: FileSpreadsheet },
    { label: t("navigation.profile", "Me"), path: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
      <div className="flex items-stretch justify-between h-14 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path.split("?")[0]);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl transition-all flex-1 min-w-0",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium leading-none truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom,0)] bg-card" />
    </nav>
  );
}
