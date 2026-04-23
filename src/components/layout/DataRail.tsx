import { Link, useLocation, useSearchParams } from "react-router-dom";
import { FileSpreadsheet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import walletIconBlue from "@/assets/wallet-icon-blue.png";

/**
 * Vertical blue rail — always visible on authenticated pages.
 * Provides quick access to user data uploads (bank statements, investments)
 * regardless of which section the user is currently viewing.
 */
export function DataRail() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isMyData = location.pathname === "/my-data";
  const activeTab = isMyData ? (searchParams.get("tab") ?? "bank") : null;

  const items = [
    {
      key: "bank",
      label: "Bank statements",
      icon: FileSpreadsheet,
      to: "/my-data?tab=bank",
    },
    {
      key: "investments",
      label: "Investment statements",
      icon: TrendingUp,
      to: "/my-data?tab=investments",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-16 bg-primary flex-col items-center py-3 gap-2"
        aria-label="Data rail"
      >
        {/* Logo mark */}
        <Link
          to="/dashboard"
          className="w-10 h-10 rounded-xl bg-primary-foreground/15 hover:bg-primary-foreground/25 flex items-center justify-center transition-colors mb-1"
          aria-label="Pocket home"
        >
          <img src={walletIconBlue} alt="" className="w-6 h-6 brightness-0 invert" />
        </Link>

        <div className="w-8 h-px bg-primary-foreground/20 my-1" />

        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <Link
                  to={item.to}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    active
                      ? "bg-primary-foreground text-primary shadow-sm"
                      : "text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground",
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </aside>
    </TooltipProvider>
  );
}