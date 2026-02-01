import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { CurrencySelector } from "./CurrencySelector";
import { NotificationBell } from "./NotificationBell";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

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
    <div className="min-h-screen bg-background dashboard-theme">
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main content area - with margin for sidebar */}
      <div className="lg:ml-64 md:ml-20 min-h-screen pb-20 md:pb-0">
        {/* Top header bar with actions - edge-to-edge, no rounded corners */}
        <header className="sticky top-0 z-30 w-full bg-card border-b border-border">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            {/* Left side: Mobile hamburger space + Currency Selector */}
            <div className="flex items-center">
              <div className="md:hidden w-12" />
              <CurrencySelector variant="light" />
            </div>
            
            {/* Right side: Notifications + Avatar */}
            <div className="flex items-center gap-2 md:gap-3">
              <NotificationBell variant="light" />
              
              {/* User avatar */}
              <Link to="/profile">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-light transition-all",
                  isActive('/profile') 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-foreground text-background hover:bg-foreground/90"
                )}>
                  {getInitials()}
                </div>
              </Link>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        {children}
      </div>
      
      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
