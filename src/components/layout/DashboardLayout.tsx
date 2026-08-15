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

  return (
    <div className="min-h-screen bg-background dashboard-theme relative">
      <MobileNav />
      <AppHeader />

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
