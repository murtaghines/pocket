import { Link } from "react-router-dom";
import walletTextWhite from "@/assets/wallet-text-white.png";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={walletTextWhite} alt="wallet" className="h-5 w-auto opacity-60" />
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Términos
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contacto
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © 2024 wallet. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
