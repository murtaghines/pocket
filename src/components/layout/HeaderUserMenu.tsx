import { Link } from "react-router-dom";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
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

  const displayName = (() => {
    const first = profile?.first_name?.trim() ?? "";
    const last = profile?.last_name?.trim() ?? "";
    return [first, last].filter(Boolean).join(" ");
  })();

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <NotificationBell />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Profile menu"
            className="flex items-center gap-[10px] cursor-pointer hover:opacity-80 transition-opacity"
          >
            <User className="w-5 h-5 text-primary" strokeWidth={2} />
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
