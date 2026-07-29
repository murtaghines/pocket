import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";

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

  // Page title shown at the left of the top bar
  const title = (() => {
    if (location.pathname === "/dashboard") return "Dashboard";
    if (location.pathname.startsWith("/history")) return t("navigation.history", "History");
    if (location.pathname.startsWith("/investments")) return t("navigation.investments", "Investments");
    if (location.pathname.startsWith("/planning")) return t("navigation.planning", "Planning");
    return undefined;
  })();

  return (
    <div className="min-h-screen bg-background dashboard-theme relative">
      <AppHeader title={title} />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Main content */}
      <main className="w-full px-4 md:px-[30px] pt-4 md:pt-[8px] pb-20 md:pb-[40px] relative z-10">
        {children}
      </main>
    </div>
  );
}
