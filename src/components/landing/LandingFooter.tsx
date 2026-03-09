import { Link } from "react-router-dom";
import pocketLogoWhite from "@/assets/pocket-logo-white.png";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 py-12" style={{ background: '#0A0A0A' }}>
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={pocketLogoWhite} alt="pocket" className="h-5 w-auto opacity-60" />
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-white/50">
            <a href="#" className="hover:text-white/80 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white/80 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white/80 transition-colors">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-white/40">
            © 2026 pocket. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
