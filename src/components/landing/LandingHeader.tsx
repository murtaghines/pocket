import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import walletTextWhite from "@/assets/wallet-text-white.png";

export function LandingHeader() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isLoginMode = isAuthPage && location.search.includes("mode=login");
  const isRegisterMode = isAuthPage && !isLoginMode;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-7xl mx-auto">
        <nav className="flex items-center justify-between bg-accent/95 backdrop-blur-xl border border-border/50 rounded-full px-6 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={walletTextWhite} alt="wallet" className="h-6 w-auto" />
          </Link>

          {/* Center Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>

          {/* Right side - Auth buttons */}
          <div className="flex items-center gap-3">
            <Link to="/auth?mode=login">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-sm ${isLoginMode ? 'bg-white/10 text-white' : ''}`}
              >
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button 
                size="sm" 
                className={`text-sm rounded-full px-5 ${isRegisterMode ? 'ring-2 ring-white ring-offset-2 ring-offset-accent' : ''}`}
              >
                Get started
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
