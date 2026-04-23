import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FileSpreadsheet, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Vertical blue rail — always visible on authenticated pages.
 * Layout: a "Close / back to home" button at the top, data icons anchored
 * to the bottom for thumb-friendly access.
 */
export function DataRail() {
  const location = useLocation();
  const navigate = useNavigate();
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
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-16 bg-primary flex-col items-center justify-between py-3"
        aria-label="Data rail"
      >
        {/* Top: close / back to home */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              aria-label="Close and go back to home"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Close · Back to home
          </TooltipContent>
        </Tooltip>

        {/* Bottom: data icons */}
        <div className="flex flex-col items-center gap-2">
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
        </div>
      </aside>
    </TooltipProvider>
  );
}