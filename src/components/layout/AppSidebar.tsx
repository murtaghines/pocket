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
import walletIconBlue from "@/assets/wallet-icon-blue.png";
import walletTextBlack from "@/assets/wallet-text-black.png";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation('common');
  
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
  
  return (
    <>
      {/* Desktop Sidebar: Full with icons + text */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40">
        {/* Logo - same height as header (h-16) */}
        <div className="h-16 px-6 border-b border-border flex items-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={walletIconBlue} alt="wallet icon" className="h-8 w-auto" />
            <img src={walletTextBlack} alt="wallet" className="h-5 w-auto" />
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                isActive(item.path) 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted text-foreground"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
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

      {/* Tablet Sidebar: Icons only */}
      <aside className="hidden md:flex lg:hidden flex-col fixed left-0 top-0 h-full w-20 bg-card border-r border-border z-40">
        {/* Logo - same height as header (h-16) */}
        <div className="h-16 border-b border-border flex items-center justify-center">
          <Link to="/dashboard">
            <img src={walletIconBlue} alt="wallet icon" className="h-8 w-auto" />
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-center w-14 h-14 rounded-xl transition-all mx-auto",
                isActive(item.path) 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              title={item.label}
            >
              {item.icon}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile: Hamburger trigger in header area */}
      <div className="md:hidden fixed top-0 left-0 z-50 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="rounded-full text-foreground hover:bg-muted bg-background shadow-sm"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Mobile: Sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Mobile: Sidebar panel */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-72 bg-card border-r border-border shadow-lg z-50 transform transition-transform duration-300 ease-out md:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
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
            onClick={() => setIsOpen(false)}
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
              onClick={() => setIsOpen(false)}
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
    </>
  );
}
