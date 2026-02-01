import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "./CurrencySelector";
import { DashboardSidebar } from "./DashboardSidebar";
import { NotificationBell } from "./NotificationBell";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/hooks/useProfile";
import walletTextWhite from "@/assets/wallet-text-white.png";

export function Header() {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const { t } = useTranslation('common');

  const isActive = (path: string) => location.pathname === path;
  const isProfilePage = location.pathname === '/profile';
  const isDashboard = location.pathname === '/dashboard';
  const isInvestments = location.pathname === '/investments';

  // Get user initials for avatar
  const getInitials = () => {
    if (profile?.first_name) {
      const first = profile.first_name.charAt(0).toUpperCase();
      const last = profile.last_name?.charAt(0).toUpperCase() || '';
      return first + last;
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#171717] border-b border-white/10">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left side - Sidebar trigger & Logo (desktop) / Logo only (mobile) */}
        <div className="flex items-center gap-3">
          {/* Dashboard sidebar with hamburger - only on dashboard/investments */}
          {(isDashboard || isInvestments) && <DashboardSidebar />}
          
          {/* Mobile logo - show when no sidebar OR on mobile */}
          {!(isDashboard || isInvestments) && (
            <Link to="/dashboard" className="flex items-center">
              <img src={walletTextWhite} alt="wallet" className="h-6 w-auto" />
            </Link>
          )}
        </div>

        {/* Right side - Notifications, Currency & Profile */}
        <div className="flex items-center gap-2 md:gap-3">
          <CurrencySelector variant="dark" />
          
          {/* Notification Bell */}
          <NotificationBell variant="dark" />
          
          {/* On Profile page (mobile): show back arrow */}
          {isProfilePage && (
            <Link to="/dashboard" className="md:hidden">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-white/10 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          )}
          
          {/* User avatar */}
          <Link to="/profile" className={cn(isProfilePage && "hidden md:block")}>
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              isActive('/profile') 
                ? "bg-primary text-primary-foreground" 
                : "bg-white/20 text-white hover:bg-white/30"
            )}>
              {getInitials()}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
