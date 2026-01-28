import { Moon, Sun, LogOut, PiggyBank, LayoutDashboard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "./CurrencySelector";
import { useTranslation } from "react-i18next";
import fintTextBlue from "@/assets/fint-text-blue.png";

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const { signOut } = useAuth();
  const location = useLocation();
  const { t } = useTranslation('common');

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center">
            <img src={fintTextBlue} alt="fint" className="h-6 w-auto" />
          </Link>

          {/* Navigation */}
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
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Selector */}
          <CurrencySelector />
          
          {/* Mobile navigation */}
          <div className="flex md:hidden items-center gap-1">
            <Link to="/">
              <Button variant={isActive('/') ? 'secondary' : 'ghost'} size="icon">
                <LayoutDashboard className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/investments">
              <Button variant={isActive('/investments') ? 'secondary' : 'ghost'} size="icon">
                <PiggyBank className="w-5 h-5" />
              </Button>
            </Link>
          </div>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Link to="/profile">
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
