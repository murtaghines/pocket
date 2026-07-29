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

/**
 * The top bar's right cluster — notification bell, theme toggle and the profile dropdown.
 * Extracted so every page's header (dashboard, workspace pages…) renders the exact same utilities.
 */
export function HeaderUserMenu() {
  const { t } = useTranslation("common");
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const initials = (() => {
    const f = profile?.first_name?.charAt(0).toUpperCase() ?? "";
    const l = profile?.last_name?.charAt(0).toUpperCase() ?? "";
    return f + l || "U";
  })();

  return (
    <div className="flex items-center gap-[9px]">
      <div className="relative">
        <NotificationBell variant="light" />
      </div>

      <ThemeToggle />

      <div className="w-px h-[30px] bg-border mx-[5px]" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Profile menu"
            className="flex items-center gap-[10px] cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div
              className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-primary-foreground text-[13px] font-semibold"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initials}
            </div>
            <ChevronDown className="w-[16px] h-[16px] text-muted-foreground" strokeWidth={2} />
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
