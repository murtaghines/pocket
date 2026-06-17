import { Link } from "react-router-dom";
import pocketLogoWhite from "@/assets/pocket-logo-white.png";

export function LandingFooter() {
  return (
    <footer
      className="relative overflow-hidden py-14"
      style={{ background: "#1b76ff" }}
    >
      {/* Ghost brand mark */}
      <div
        className="absolute right-[-2rem] bottom-[-2rem] pointer-events-none select-none font-black uppercase text-white/[0.06] leading-none tracking-tight"
        style={{ fontSize: "clamp(5rem, 18vw, 15rem)" }}
      >
        ✦
      </div>

      <div className="container px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src={pocketLogoWhite} alt="pocket" className="w-7 h-7" />
            <span className="text-lg font-black text-white lowercase tracking-tight">pocket</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-white/60 font-semibold">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-white/40">
            © 2026 pocket.
          </p>
        </div>
      </div>
    </footer>
  );
}
