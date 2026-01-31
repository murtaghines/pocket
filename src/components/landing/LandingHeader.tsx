import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import fintTextWhite from "@/assets/fint-text-white.png";

export function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-7xl mx-auto">
        <nav className="flex items-center justify-between bg-card/90 backdrop-blur-xl border border-border/50 rounded-full px-6 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={fintTextWhite} alt="fint" className="h-6 w-auto" />
          </Link>

          {/* Center Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Características
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cómo funciona
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Testimonios
            </a>
          </div>

          {/* Right side - Auth buttons */}
          <div className="flex items-center gap-3">
            <Link to="/auth?mode=login">
              <Button variant="ghost" size="sm" className="text-sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="text-sm rounded-full px-5">
                Comenzar
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
