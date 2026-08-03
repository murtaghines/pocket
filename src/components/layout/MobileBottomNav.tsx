import { useRef, useState, useLayoutEffect, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, PiggyBank, Target, Database, User, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  match: string[];
}

export function MobileBottomNav() {
  const location = useLocation();
  const { t } = useTranslation("common");
  const pillRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [slide, setSlide] = useState<{ x: number; w: number } | null>(null);
  const [canAnimate, setCanAnimate] = useState(false);

  const items: NavItem[] = [
    { label: t("navigation.home", "Home"), path: "/dashboard", icon: Home, match: ["/dashboard"] },
    { label: t("navigation.history", "History"), path: "/history", icon: TrendingUp, match: ["/history"] },
    { label: t("navigation.investments", "Investments"), path: "/investments", icon: PiggyBank, match: ["/investments"] },
    { label: t("navigation.planning", "Planning"), path: "/planning", icon: Target, match: ["/planning"] },
    { label: t("navigation.data", "Data"), path: "/my-data", icon: Database, match: ["/my-data", "/categories"] },
    { label: t("navigation.account", "Account"), path: "/account", icon: User, match: ["/account", "/profile"] },
  ];

  const isActive = (match: string[]) =>
    match.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  const activeIndex = items.findIndex((item) => isActive(item.match));

  useLayoutEffect(() => {
    const pill = pillRef.current;
    const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
    if (!pill || !el) return;
    const pr = pill.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    setSlide({ x: er.left - pr.left, w: er.width });
  }, [activeIndex]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setCanAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] md:hidden">
      <div
        ref={pillRef}
        className="pointer-events-auto relative flex w-full items-center justify-between rounded-full bg-primary p-2.5 shadow-[0_12px_30px_-8px_rgba(20,80,210,0.55)]"
      >
        {/* Sliding active indicator */}
        {slide && (
          <div
            className="absolute top-2.5 bottom-2.5 rounded-full bg-white/[0.18]"
            style={{
              left: slide.x,
              width: slide.w,
              transition: canAnimate
                ? "left 400ms cubic-bezier(0.4, 0, 0.2, 1), width 400ms cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
            }}
          />
        )}

        {items.map((item, i) => {
          const Icon = item.icon;
          const active = isActive(item.match);
          return (
            <Link
              key={item.path}
              ref={(el) => { itemRefs.current[i] = el; }}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 flex items-center justify-center rounded-full py-2 transition-[padding] duration-300 ease-out",
                active ? "px-3" : "px-2",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors duration-300",
                  active ? "text-white" : "text-white/60",
                )}
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap text-[13px] font-medium leading-none text-white transition-all duration-300 ease-out",
                  active ? "ml-1.5 max-w-[80px] opacity-100" : "ml-0 max-w-0 opacity-0",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
