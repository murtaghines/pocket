import { ReactNode, useEffect } from "react";
import { AppHeader } from "./AppHeader";
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
      return () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      };
    }
  }, [fullBleed]);

  return (
    <div className={cn(
      "bg-background dashboard-theme relative",
      fullBleed ? "h-dvh flex flex-col overflow-hidden" : "min-h-screen",
    )}>
      <MobileNav />
      <AppHeader />

      <main
        className={cn(
          "w-full relative z-10",
          fullBleed
            ? "bg-card flex-1 min-h-0 flex flex-col"
            : "px-4 md:px-[28px] pt-4 md:pt-[8px] pb-6 md:pb-[30px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}
