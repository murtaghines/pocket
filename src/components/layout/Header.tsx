import { PiggyBank, LayoutDashboard, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "./CurrencySelector";
import { useTranslation } from "react-i18next";
import fintTextBlue from "@/assets/fint-text-blue.png";

export function Header() {
  const { signOut } = useAuth();
  const location = useLocation();
  const { t } = useTranslation('common');

  const isActive = (path: string) => location.pathname === path;
  const isProfilePage = location.pathname === '/profile';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <img src={fintTextBlue} alt="fint" className="h-6 w-auto" />
          </Link>
        </div>

        {/* Center Navigation - Desktop only */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/">
            <Button 
              variant={isActive('/') ? 'secondary' : 'ghost'} 
              size="sm"
              className={cn(
                "gap-2",
                isActive('/') && "bg-primary/10 text-primary"
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
                isActive('/investments') && "bg-purple-500/10 text-purple-600"
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
            <Link to="/" className="md:hidden">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-primary"
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
              className={cn(isActive('/profile') && "bg-primary/10 text-primary")}
            >
              <User className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
