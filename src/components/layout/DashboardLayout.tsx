import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppHeader } from "./AppHeader";
import { MobileNav } from "./MobileNav";
import { getActiveSection } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  /**
   * Full-bleed workspace pages (Data, Categories) — skips <main>'s padding and the header's
   * period selectors, since those pages render their own toolbar/canvas edge-to-edge.
   */
  fullBleed?: boolean;
}

export function DashboardLayout({ children, fullBleed = false }: DashboardLayoutProps) {
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
  const section = getActiveSection(location.pathname);
  const title = section ? t(section.i18nKey) : undefined;

  return (
    <div className="min-h-screen bg-background dashboard-theme relative">
      <MobileNav />
      <AppHeader title={title} showSelectors={!fullBleed} />

      {/* Main content */}
      <main
        className={cn(
          "w-full relative z-10",
          fullBleed
            ? "bg-card min-h-screen"
            : "px-4 md:px-[30px] pt-4 md:pt-[8px] pb-6 md:pb-[40px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}
