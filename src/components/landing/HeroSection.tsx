import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import pocketIcon from "@/assets/pocket-icon.png";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function HeroSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();

  const headlineY = progress * -80;
  const cardY = progress * -40;

  return (
    <section
      ref={ref}
      data-nav-theme="dark"
      className="relative pt-28 pb-16 lg:pt-36 lg:pb-20 overflow-hidden min-h-screen"
      style={{ background: "#1b76ff" }}
    >
      {/* Ghost text — large, bottom-anchored, behind everything */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0 select-none overflow-hidden">
        <div
          className="font-black uppercase text-white leading-[0.82] tracking-tight"
          style={{ opacity: 0.18 }}
        >
          {(["LIKE", "NEVER", "BEFORE"] as const).map((word, i) => (
            <div
              key={word}
              className="will-change-transform"
              style={{
                fontSize: "clamp(5rem, 19vw, 17rem)",
                transform: `translate3d(0, ${progress * (15 + i * 12)}px, 0)`,
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="container px-4 md:px-6 relative z-10">
        {/* Top-right side note — desktop only */}
        <div className="hidden lg:block absolute right-6 top-8 max-w-[280px] text-white">
          <p className="text-[10px] font-bold tracking-[0.22em] mb-3 opacity-80">DO MORE WITH POCKET</p>
          <p className="text-sm leading-relaxed text-white/85">
            Upload bank statements, auto-categorize every transaction with AI,
            and see your full financial picture in one place.
          </p>
        </div>

        {/* Massive headline */}
        <h1
          className="font-black text-white tracking-tight uppercase leading-[0.88] will-change-transform"
          style={{
            fontSize: "clamp(3rem, 13vw, 12rem)",
            transform: `translate3d(0, ${headlineY}px, 0)`,
          }}
        >
          Track your
          <br />
          money
        </h1>

        {/* Floating card */}
        <div
          className="my-6 lg:my-8 inline-flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-4 lg:p-5 will-change-transform"
          style={{ transform: `translate3d(0, ${cardY}px, 0)` }}
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-white flex items-center justify-center shadow-lg">
            <img src={pocketIcon} alt="Pocket" className="w-10 h-10 lg:w-12 lg:h-12" />
          </div>
          <div className="text-white">
            <div className="text-[10px] tracking-[0.22em] font-bold opacity-75 mb-1">FREE FOREVER</div>
            <div className="text-base font-bold leading-tight">
              Get started
              <br />
              in 30 seconds
            </div>
          </div>
        </div>

        {/* Mobile sub-copy */}
        <p className="lg:hidden mt-6 text-white/85 text-base max-w-md leading-relaxed">
          Upload bank statements, auto-categorize every transaction with AI, and see your full financial picture in one place.
        </p>

        <div className="mt-10 lg:mt-12">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-white text-[#080808] font-semibold rounded-full px-7 py-4 text-base shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
          >
            Get started for free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
