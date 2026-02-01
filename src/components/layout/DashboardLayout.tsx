import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  PiggyBank, 
  User, 
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { CurrencySelector } from "./CurrencySelector";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import walletIconBlue from "@/assets/wallet-icon-blue.png";
import walletTextBlack from "@/assets/wallet-text-black.png";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const navItems: NavItem[] = [
    { 
      label: t('navigation.dashboard'), 
      path: '/dashboard', 
      icon: <LayoutDashboard className="w-5 h-5" /> 
    },
    { 
      label: t('navigation.investments'), 
      path: '/investments', 
      icon: <PiggyBank className="w-5 h-5" /> 
    },
    { 
      label: t('navigation.profile'), 
      path: '/profile', 
      icon: <User className="w-5 h-5" /> 
    },
  ];
  
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
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - Full with icons + text */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-56 bg-card border-r border-border flex-col z-40">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={walletIconBlue} alt="wallet icon" className="h-8 w-auto" />
            <img src={walletTextBlack} alt="wallet" className="h-5 w-auto" />
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive(item.path) 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © 2026 wallet
          </p>
        </div>
      </aside>

      {/* Tablet Sidebar - Icons only */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-full w-16 bg-card border-r border-border flex-col items-center z-40">
        {/* Logo - icon only */}
        <div className="p-3 border-b border-border w-full flex justify-center">
          <Link to="/dashboard">
            <img src={walletIconBlue} alt="wallet icon" className="h-8 w-auto" />
          </Link>
        </div>
        
        {/* Navigation - icons only */}
        <nav className="flex-1 py-3 px-2 space-y-1 w-full">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={cn(
                "flex items-center justify-center w-full h-11 rounded-xl transition-all",
                isActive(item.path) 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar panel */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-72 bg-card border-r border-border shadow-lg z-50 transform transition-transform duration-300 ease-out md:hidden",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img src={walletIconBlue} alt="wallet icon" className="h-7 w-auto" />
            <img src={walletTextBlack} alt="wallet" className="h-5 w-auto" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                isActive(item.path) 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted text-foreground"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
              <ChevronRight className={cn(
                "w-4 h-4 ml-auto transition-transform",
                isActive(item.path) && "translate-x-1"
              )} />
            </Link>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © 2026 wallet
          </p>
        </div>
      </div>

      {/* Main content area with offset for sidebar */}
      <div className="md:ml-16 lg:ml-56">
        {/* Header */}
        <header className="sticky top-0 z-30 w-full bg-background border-b border-border">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            {/* Mobile: Hamburger + Logo */}
            <div className="flex md:hidden items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(true)}
                className="rounded-full text-foreground hover:bg-muted"
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              <Link to="/dashboard" className="flex items-center gap-1">
                <img src={walletIconBlue} alt="wallet icon" className="h-5 w-auto" />
                <img src={walletTextBlack} alt="wallet" className="h-3.5 w-auto" />
              </Link>
            </div>
            
            {/* Desktop/Tablet: Empty space on left (sidebar has logo) */}
            <div className="hidden md:block" />

            {/* Right side - Notifications, Currency & Profile */}
            <div className="flex items-center gap-2 md:gap-3 ml-auto">
              <CurrencySelector variant="light" />
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
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
