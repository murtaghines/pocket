import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import pocketIcon from "@/assets/pocket-icon.png";


export function LandingHeader() {
  // theme is determined by the section currently behind the navbar
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-nav-theme]")
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // pick the entry whose top is just below the nav (≈80px)
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const target = visible[0]?.target as HTMLElement | undefined;
        if (target) {
          const t = target.getAttribute("data-nav-theme");
          if (t === "light" || t === "dark") setTheme(t);
        }
      },
      { rootMargin: "-72px 0px -85% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const isDark = theme === "dark"; // dark = blue or black bg sections

  // On dark (blue/black bg): logo text white, icon white, glass pill
  // On light (white bg): logo text black, icon natural, subtle border
  const logoBg = isDark
    ? "bg-white/10 border-white/15 backdrop-blur-xl"
    : "bg-black/5 border-black/8 backdrop-blur-xl";
  const logoText = isDark ? "text-white" : "text-[#080808]";
  const iconClass = isDark ? "brightness-0 invert" : ""; // white on dark, natural on light

  // Buttons
  const loginText = isDark ? "text-white hover:text-white/75" : "text-[#080808] hover:text-[#080808]/60";
  const ctaStyle = isDark
    ? "bg-white text-[#080808] hover:bg-white/90"
    : "bg-[#080808] text-white hover:bg-[#080808]/85";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-5 py-4 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo (left) */}
        <Link
          to="/"
          className={`pointer-events-auto inline-flex items-center gap-2 border ${logoBg} ${logoText} rounded-full pl-3 pr-5 py-2 transition-all duration-300`}
        >
          <img
            src={pocketIcon}
            alt="pocket"
            className={`h-6 w-auto transition-all duration-300 ${iconClass}`}
          />
          <span className="text-sm font-bold lowercase tracking-tight">pocket</span>
        </Link>

        {/* Right-side actions */}
        <div className="flex items-center gap-1">
          <Link
            to="/auth?mode=login"
            className={`pointer-events-auto inline-flex items-center px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full ${loginText}`}
          >
            Log in
          </Link>
          <Link
            to="/auth"
            className={`pointer-events-auto inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${ctaStyle}`}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
