import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  PiggyBank, 
  User, 
  Settings, 
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import walletIconBlue from "@/assets/wallet-icon-blue.png";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export function DashboardSidebar() {
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
      {/* Hamburger button - only visible on desktop */}
      <div className="hidden md:flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full hover:bg-muted"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {/* Logo pill */}
        <div className="flex items-center gap-2 bg-foreground text-background px-3 py-2 rounded-full">
          <img src={walletIconBlue} alt="" className="w-5 h-5 invert" />
          <span className="font-semibold text-sm">wallet</span>
        </div>
      </div>
      
      {/* Sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar panel */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-72 bg-card border-r border-border shadow-lg z-50 transform transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
              <img src={walletIconBlue} alt="" className="w-5 h-5 invert" />
            </div>
            <div>
              <span className="font-semibold">wallet</span>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
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
