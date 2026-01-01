import { Wallet, Bell, Moon, Sun, LogOut, PiggyBank, LayoutDashboard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const { signOut } = useAuth();
  const location = useLocation();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">
                FinanceFlow
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Tu control financiero personal
              </p>
            </div>
          </div>

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
                Dashboard
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
                Inversiones
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
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
