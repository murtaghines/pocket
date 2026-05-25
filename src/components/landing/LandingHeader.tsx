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

  const isDark = theme === "dark";
  // pill backgrounds invert: on light sections (yellow/white) we use a dark pill,
  // on dark sections (blue/black) we use a white pill — like unipay screenshots.
  const pillBg = isDark ? "bg-white/90" : "bg-[#080808]/85";
  const pillText = isDark ? "text-[#080808]" : "text-white";
  const pillBorder = isDark ? "border-black/5" : "border-white/10";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo pill (left) */}
        <Link
          to="/"
          className={`pointer-events-auto inline-flex items-center gap-2 backdrop-blur-xl border ${pillBorder} ${pillBg} ${pillText} rounded-full pl-3 pr-5 py-2 transition-colors duration-300`}
        >
          <img
            src={pocketIcon}
            alt="pocket"
            className={`h-6 w-auto ${isDark ? "" : "brightness-0 invert"}`}
          />
          <span className="text-base font-bold lowercase tracking-tight">pocket</span>
        </Link>

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/auth?mode=login"
            className={`pointer-events-auto inline-flex items-center backdrop-blur-xl border ${pillBorder} ${
              isDark ? "bg-white/10 text-white" : "bg-transparent text-[#080808]"
            } rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 hover:opacity-90`}
          >
            Log in
          </Link>
          <Link
            to="/auth"
            className={`pointer-events-auto inline-flex items-center backdrop-blur-xl border ${pillBorder} ${pillBg} ${pillText} rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300`}
          >
            Get started
          </Link>
        </div>

      </div>
    </header>
  );
}
