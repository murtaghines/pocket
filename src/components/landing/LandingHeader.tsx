import { Link } from "react-router-dom";
import { useEffect, useState } from "react";


export function LandingHeader() {
  // theme is determined by the section currently behind the navbar
  // Start as "dark" because the hero (first section) is always blue/dark
  const [theme, setTheme] = useState<"light" | "dark">("dark");

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

  // isologo-blue = blue version (for light/white backgrounds)
  // isologo-white = white version (for dark/blue backgrounds)
  const logoSrc = isDark
    ? "/logos/isologo-white.png"
    : "/logos/isologo-blue.png";

  // Buttons
  const loginText = isDark
    ? "text-white/80 hover:text-white"
    : "text-[#080808]/70 hover:text-[#080808]";
  const ctaStyle = isDark
    ? "bg-white text-[#080808] hover:bg-white/90"
    : "bg-[#080808] text-white hover:bg-black/85";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-5 py-5 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo — no background, plain text + icon */}
        <Link to="/" className="pointer-events-auto inline-flex items-center">
          <img
            src={logoSrc}
            alt="pocket"
            className="h-7 w-auto transition-all duration-300"
          />
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
            className={`pointer-events-auto inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${ctaStyle}`}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
