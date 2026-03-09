import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import pocketLogoWhite from "@/assets/pocket-logo-white.png";
import pocketIcon from "@/assets/pocket-icon.png";

export function LandingHeader() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isLoginMode = isAuthPage && location.search.includes("mode=login");
  const isRegisterMode = isAuthPage && !isLoginMode;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-7xl mx-auto">
        <nav className="flex items-center justify-between backdrop-blur-xl border border-white/10 rounded-full px-6 py-3" style={{ background: '#0F4264' }}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={pocketIcon} alt="pocket" className="h-7 w-auto" />
            <img src={pocketLogoWhite} alt="pocket" className="h-4 w-auto" />
          </Link>

          {/* Center Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">
              How it works
            </a>
            <a href="#contact" className="text-sm text-white/60 hover:text-white transition-colors">
              Contact
            </a>
          </div>

          {/* Right side - Auth buttons */}
          <div className="flex items-center gap-3">
            <Link to="/auth?mode=login">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-sm text-white/80 hover:text-white hover:bg-white/10 ${isLoginMode ? 'font-bold text-white' : ''}`}
              >
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button 
                size="sm" 
                className={`text-sm rounded-full px-5 bg-white text-[#0F4264] hover:bg-white/90 ${isRegisterMode ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F4264]' : ''}`}
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
