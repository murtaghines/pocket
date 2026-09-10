import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  fullBleed?: boolean;
}

export function DashboardLayout({ children, fullBleed = false }: DashboardLayoutProps) {
  useEffect(() => {
    document.body.classList.add("dashboard-theme");
    return () => {
      document.body.classList.remove("dashboard-theme");
    };
  }, []);

  useEffect(() => {
    if (fullBleed) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
      return () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
        document.body.style.height = "";
      };
    }
  }, [fullBleed]);

  return (
    <div
      className={cn(
        "bg-background dashboard-theme relative",
        fullBleed ? "h-dvh flex overflow-hidden" : "min-h-screen md:flex md:h-dvh md:overflow-hidden",
      )}
    >
      {/* Mobile: top nav header + hamburger */}
      <MobileNav />

      {/* Desktop: fixed sidebar */}
      <Sidebar />

      {/* Content area — scrolls independently on desktop */}
      <main
        className={cn(
          "w-full relative z-10 flex-1 min-w-0",
          fullBleed
            ? "bg-card flex flex-col min-h-0"
            : "md:h-dvh md:overflow-y-auto px-4 md:px-0 pt-4 md:pt-0 pb-6 md:pb-0",
        )}
      >
        {children}
      </main>
    </div>
  );
}
