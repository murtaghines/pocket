import { Link } from "react-router-dom";
import { Logo } from "@/components/brand";

export function LandingFooter() {
  return (
    <footer
      className="relative overflow-hidden py-14"
      style={{ background: "#1b76ff" }}
    >
      {/* Ghost brand mark */}
      <Logo
        variant="full"
        className="absolute right-[-2rem] bottom-[-2rem] pointer-events-none select-none text-white w-full h-full"
        style={{ width: "clamp(5rem, 18vw, 15rem)", opacity: 0.06 }}
        aria-hidden="true"
      />

      <div className="container px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo size={28} className="text-white" />
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
