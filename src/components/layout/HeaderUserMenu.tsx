import { Link } from "react-router-dom";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HeaderUserMenu() {
  const { t } = useTranslation("common");
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const initials = (() => {
    const f = profile?.first_name?.charAt(0).toUpperCase() ?? "";
    const l = profile?.last_name?.charAt(0).toUpperCase() ?? "";
    return f + l || "U";
  })();

  const displayName = (() => {
    const first = profile?.first_name?.trim();
    if (!first) return "";
    const lastInitial = profile?.last_name?.trim()?.charAt(0).toUpperCase();
    return lastInitial ? `${first} ${lastInitial}.` : first;
  })();

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <NotificationBell />
      </div>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Profile menu"
            className="flex items-center gap-[10px] cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground text-[13px] font-bold tracking-[0.02em] shrink-0"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initials}
            </div>
            {displayName && (
              <span className="text-[13.5px] font-semibold text-foreground whitespace-nowrap">{displayName}</span>
            )}
            <ChevronDown className="w-[13px] h-[13px] text-muted-foreground" strokeWidth={2.5} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link to="/account" className="flex items-center gap-2 cursor-pointer">
              <User className="w-4 h-4" />
              {t("navigation.account", "Account")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut()}
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            {t("navigation.logout", "Log out")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
