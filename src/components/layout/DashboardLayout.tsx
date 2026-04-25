import { ReactNode, useEffect } from "react";
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
import { DataRail } from "./DataRail";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { t } = useTranslation("common");

  // Add dashboard-theme to body so portaled elements (popovers, selects, dialogs) inherit theme
  useEffect(() => {
    document.body.classList.add("dashboard-theme");
    return () => {
      document.body.classList.remove("dashboard-theme");
    };
  }, []);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const mobileNavItems = [
    { label: t("navigation.dashboard", "Dashboard"), path: "/dashboard", icon: LayoutDashboard },
    { label: t("navigation.history", "History"), path: "/history", icon: BarChart3 },
    { label: t("navigation.investments", "Investments"), path: "/investments", icon: PiggyBank },
    { label: "Planning", path: "/planning/budgets", icon: Target },
    { label: "Data", path: "/my-data?tab=bank", icon: FileSpreadsheet },
    { label: t("navigation.profile", "Profile"), path: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background dashboard-theme relative md:pl-24">
      {/* Persistent vertical rail (desktop) handles all navigation + utilities */}
      <DataRail />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
        <div className="flex items-center justify-around h-14 px-2 overflow-x-auto">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path.split("?")[0]);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all flex-1 min-w-[56px]",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom,0)] bg-card" />
      </nav>

      {/* Main content */}
      <main className="w-full px-4 md:px-8 pt-6 md:pt-8 pb-20 md:pb-8 relative z-10">
        {children}
      </main>
    </div>
  );
}
