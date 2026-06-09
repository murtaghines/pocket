import { Link } from "react-router-dom";
import pocketIcon from "@/assets/pocket-icon.png";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function HeroSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();
  const headlineY = progress * -60;

  return (
    <section
      ref={ref}
      data-nav-theme="dark"
      className="relative overflow-hidden flex flex-col"
      style={{ background: "#1b76ff", minHeight: "100vh" }}
    >
      {/* Main content — top of section */}
      <div
        className="container px-4 md:px-6 relative pt-24 lg:pt-32 pb-6"
        style={{ zIndex: 10 }}
      >
        {/* Top-right description */}
        <div className="hidden lg:block absolute right-6 xl:right-14 top-32 max-w-[220px] text-white">
          <p className="text-[10px] font-bold tracking-[0.28em] mb-3 opacity-55 uppercase">
            Do more with Pocket
          </p>
          <p className="text-sm leading-relaxed opacity-75">
            Upload bank statements, auto-categorize every transaction with AI,
            and see your full financial picture in one place.
          </p>
        </div>

        {/* Headline + inline card */}
        <div
          className="will-change-transform"
          style={{ transform: `translate3d(0, ${headlineY}px, 0)` }}
        >
          <h1
            className="font-black text-white tracking-tight uppercase"
            style={{ fontSize: "clamp(3rem, 10vw, 9.5rem)", lineHeight: 0.88 }}
          >
            <span className="block">Track your</span>
            <span className="flex items-center gap-5 lg:gap-7 flex-wrap lg:flex-nowrap">
              <span>Money</span>
              <Link
                to="/auth"
                className="inline-flex items-center gap-3 lg:gap-4 rounded-2xl p-3 lg:p-4 hover:bg-white/15 transition-colors duration-200 shrink-0"
                style={{
                  fontSize: "initial",
                  lineHeight: "initial",
                  fontWeight: "initial",
                  textTransform: "none",
                  letterSpacing: "normal",
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.20)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-white flex items-center justify-center shadow-lg shrink-0">
                  <img src={pocketIcon} alt="Pocket" className="w-9 h-9 lg:w-10 lg:h-10" />
                </div>
                <div className="text-white">
                  <div className="text-[9px] tracking-[0.24em] font-bold opacity-60 mb-1">FREE FOREVER</div>
                  <div className="text-sm lg:text-base font-bold leading-tight opacity-95">
                    Get started
                    <br />
                    in 30 seconds
                  </div>
                </div>
              </Link>
            </span>
          </h1>
        </div>

        {/* Mobile description */}
        <p className="lg:hidden mt-6 text-white/75 text-base max-w-md leading-relaxed">
          Upload bank statements, auto-categorize every transaction and see your full financial picture.
        </p>
      </div>

      {/* Flexible spacer — pushes ghost text to bottom, shrinks proportionally */}
      <div className="flex-1" style={{ minHeight: "1rem" }} />

      {/* Ghost text — anchored at bottom of section, within the viewport */}
      <div
        className="overflow-hidden select-none pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div
          className="font-black uppercase text-white leading-[0.78] tracking-tight"
          style={{ opacity: 0.14 }}
        >
          <div
            className="will-change-transform"
            style={{
              fontSize: "clamp(4rem, 17vw, 16rem)",
              transform: `translate3d(0, ${progress * 6}px, 0)`,
            }}
          >
            LIKE NEVER
          </div>
          <div
            className="will-change-transform"
            style={{
              fontSize: "clamp(4rem, 17vw, 16rem)",
              transform: `translate3d(0, ${progress * 14}px, 0)`,
            }}
          >
            BEFORE
          </div>
        </div>
      </div>
    </section>
  );
}
