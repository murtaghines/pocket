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
      className="relative overflow-hidden"
      style={{ background: "#1b76ff", minHeight: "110vh" }}
    >
      {/* Ghost text — anchored to bottom, visually separate from headline */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none select-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="font-black uppercase text-white leading-[0.8] tracking-tight"
          style={{ opacity: 0.13 }}
        >
          {(["NEVER", "BEFORE"] as const).map((word, i) => (
            <div
              key={word}
              className="will-change-transform"
              style={{
                fontSize: "clamp(5rem, 16vw, 15rem)",
                transform: `translate3d(0, ${progress * (8 + i * 10)}px, 0)`,
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="container px-4 md:px-6 relative pt-32 lg:pt-40 pb-16" style={{ zIndex: 10 }}>

        {/* Top-right description — positioned in the space to the right of the headline */}
        <div className="hidden lg:block absolute right-6 xl:right-12 top-40 max-w-[230px] text-white">
          <p className="text-[10px] font-bold tracking-[0.25em] mb-3 opacity-60 uppercase">
            Do more with Pocket
          </p>
          <p className="text-sm leading-relaxed opacity-80">
            Upload bank statements, auto-categorize every transaction with AI,
            and see your full financial picture in one place.
          </p>
        </div>

        {/* Massive headline — sized so "TRACK YOUR" stays in the left 65% of the screen */}
        <h1
          className="font-black text-white tracking-tight uppercase leading-[0.88] will-change-transform"
          style={{
            fontSize: "clamp(3rem, 10vw, 9.5rem)",
            transform: `translate3d(0, ${headlineY}px, 0)`,
          }}
        >
          Track your
          <br />
          money
        </h1>

        {/* Floating card — clickable link to sign up */}
        <Link
          to="/auth"
          className="mt-10 mb-4 inline-flex items-center gap-4 rounded-2xl p-4 lg:p-5 will-change-transform hover:bg-white/15 transition-colors duration-200 cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(12px)",
            transform: `translate3d(0, ${cardY}px, 0)`,
          }}
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-white flex items-center justify-center shadow-lg shrink-0">
            <img src={pocketIcon} alt="Pocket" className="w-10 h-10 lg:w-12 lg:h-12" />
          </div>
          <div className="text-white">
            <div className="text-[10px] tracking-[0.22em] font-bold opacity-60 mb-1">FREE FOREVER</div>
            <div className="text-base font-bold leading-tight opacity-95">
              Get started
              <br />
              in 30 seconds
            </div>
          </div>
        </Link>

        {/* Mobile description */}
        <p className="lg:hidden mt-4 text-white/75 text-base max-w-md leading-relaxed">
          Upload bank statements, auto-categorize every transaction and see your full financial picture.
        </p>

        {/* CTA button */}
        <div className="mt-8 lg:mt-10">
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
