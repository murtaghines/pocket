import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import pocketIcon from "@/assets/pocket-icon.png";

export function HeroSection() {
  return (
    <section className="relative pt-28 pb-12 lg:pt-36 lg:pb-20 overflow-hidden" style={{ background: "#1b76ff" }}>
      <div className="container px-4 md:px-6 relative">
        {/* Top-right side note */}
        <div className="hidden lg:block absolute right-6 top-36 max-w-xs text-white">
          <p className="text-xs font-bold tracking-[0.2em] mb-3">DO MORE WITH POCKET</p>
          <p className="text-sm leading-relaxed text-white/90">
            Upload bank statements, auto-categorize every transaction with AI,
            and see your full financial picture in one place.
          </p>
        </div>

        {/* Massive headline */}
        <h1
          className="font-black text-white tracking-tight uppercase leading-[0.88]"
          style={{ fontSize: "clamp(3rem, 13vw, 12rem)" }}
        >
          Track your
          <br />
          money
        </h1>

        {/* Floating "QR-style" card */}
        <div className="my-6 lg:my-8 inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl p-4 lg:p-5">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-white flex items-center justify-center">
            <img src={pocketIcon} alt="Pocket" className="w-10 h-10 lg:w-12 lg:h-12" />
          </div>
          <div className="text-white">
            <div className="text-[10px] tracking-[0.2em] font-semibold opacity-80">FREE FOREVER</div>
            <div className="text-base font-bold leading-tight">Get started<br/>in 30 seconds</div>
          </div>
        </div>

        {/* Ghost echo headline */}
        <h2
          className="font-black uppercase tracking-tight leading-[0.88] text-white/25 select-none"
          style={{ fontSize: "clamp(3rem, 13vw, 12rem)" }}
        >
          like never
          <br />
          before
        </h2>

        {/* Mobile sub-copy */}
        <p className="lg:hidden mt-8 text-white/90 text-base max-w-md">
          Upload bank statements, auto-categorize every transaction with AI, and see your full financial picture in one place.
        </p>

        <div className="mt-10">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-white text-[#080808] font-semibold rounded-full px-7 py-4 text-base shadow-xl hover:shadow-2xl transition-shadow"
          >
            Get started for free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
