import { PiggyBank, LayoutDashboard, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "./CurrencySelector";
import { useTranslation } from "react-i18next";
import fintTextWhite from "@/assets/fint-text-white.png";

export function Header() {
  const { signOut } = useAuth();
  const location = useLocation();
  const { t } = useTranslation('common');

  const isActive = (path: string) => location.pathname === path;
  const isProfilePage = location.pathname === '/profile';
  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center">
          <Link to="/dashboard" className="flex items-center">
            <img src={fintTextWhite} alt="fint" className="h-6 w-auto" />
          </Link>
        </div>

        {/* Center Navigation - Desktop only */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/dashboard">
            <Button 
              variant={isDashboard ? 'secondary' : 'ghost'} 
              size="sm"
              className={cn(
                "gap-2",
                isDashboard && "bg-primary/20 text-primary"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              {t('navigation.dashboard')}
            </Button>
          </Link>
          <Link to="/investments">
            <Button 
              variant={isActive('/investments') ? 'secondary' : 'ghost'} 
              size="sm"
              className={cn(
                "gap-2",
                isActive('/investments') && "bg-primary/20 text-primary"
              )}
            >
              <PiggyBank className="w-4 h-4" />
              {t('navigation.investments')}
            </Button>
          </Link>
        </nav>

        {/* Right side - Currency & Profile/Back */}
        <div className="flex items-center gap-2">
          <CurrencySelector />
          
          {/* On Profile page (mobile): show back arrow. Otherwise: show profile icon */}
          {isProfilePage ? (
            <Link to="/dashboard" className="md:hidden">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-foreground hover:bg-accent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          ) : null}
          
          {/* Profile icon - always on desktop, only on non-profile pages on mobile */}
          <Link to="/profile" className={cn(isProfilePage && "hidden md:block")}>
            <Button 
              variant={isActive('/profile') ? 'secondary' : 'ghost'} 
              size="icon"
              className={cn(isActive('/profile') && "bg-primary/20 text-primary")}
            >
              <User className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
