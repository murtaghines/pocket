import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FileSpreadsheet, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import pocketLogoWhite from "@/assets/pocket-logo-white.png";

/**
 * Vertical blue rail — always visible on authenticated pages.
 * Layout: white pocket logo at the top, data icons anchored to the
 * bottom for thumb-friendly access. The "Close" button only appears when
 * the user is inside the data workspace (/my-data) so it acts as an exit.
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
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-24 bg-primary flex-col items-center justify-between py-5"
        aria-label="Data rail"
      >
        {/* Top: brand mark (white pocket icon) + rotated wordmark below */}
        <Link
          to="/dashboard"
          aria-label="Pocket — go to dashboard"
          className="flex flex-col items-center"
        >
          <img src={pocketLogoWhite} alt="Pocket" className="h-14 w-14" />
        </Link>

        {/* Bottom: data section buttons + (when inside /my-data) close button */}
        <div className="flex flex-col items-center gap-3">
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
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all border",
                      active
                        ? "bg-primary-foreground text-primary border-primary-foreground shadow-md"
                        : "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/25 hover:bg-primary-foreground/20 hover:border-primary-foreground/40",
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {isMyData && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  aria-label="Close and go back to home"
                  className="mt-1 w-12 h-12 rounded-xl flex items-center justify-center bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/25 hover:bg-primary-foreground/20 hover:border-primary-foreground/40 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Close · Back to home
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}