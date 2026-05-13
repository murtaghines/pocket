import { FileSpreadsheet, Sparkles, Wallet } from "lucide-react";
import pocketIcon from "@/assets/pocket-icon.png";

const panels = [
  {
    title: "Upload any bank statement",
    sub: "Excel or PDF. Drag, drop, done.",
    Icon: FileSpreadsheet,
  },
  {
    title: "Auto-categorized by AI",
    sub: "Every transaction sorted instantly.",
    Icon: Sparkles,
  },
  {
    title: "All your accounts in one place",
    sub: "Banks, cash and investments — together.",
    Icon: Wallet,
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white">
      {panels.map((p, i) => (
        <div
          key={p.title}
          className="relative overflow-hidden border-b border-black/5"
          style={{ background: "#FFBB03" }}
        >
          {/* Decorative dots */}
          <div className="absolute top-8 right-12 w-4 h-4 rounded-full bg-white/60" />
          <div className="absolute bottom-12 left-16 w-6 h-6 rounded-full bg-[#080808]/20" />
          <div className="absolute top-1/2 right-1/3 w-3 h-3 rounded-full bg-[#1b76ff]/40" />
          <img
            src={pocketIcon}
            alt=""
            className="absolute -bottom-10 -right-10 w-48 h-48 opacity-15 pointer-events-none"
          />

          <div className="container px-6 py-20 lg:py-32 relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12">
              {/* Big illustration block */}
              <div className="shrink-0 w-32 h-32 lg:w-44 lg:h-44 rounded-3xl bg-[#080808] flex items-center justify-center shadow-xl rotate-[-6deg]">
                <p.Icon className="w-14 h-14 lg:w-20 lg:h-20 text-white" strokeWidth={1.5} />
              </div>

              <div className="flex-1">
                <div className="text-xs font-bold tracking-[0.25em] text-[#080808]/70 mb-3">
                  STEP {String(i + 1).padStart(2, "0")}
                </div>
                <h3
                  className="font-black text-[#080808] uppercase leading-[0.92] tracking-tight"
                  style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)" }}
                >
                  {p.title}
                </h3>
                <p className="mt-4 text-lg lg:text-xl text-[#080808]/80 max-w-xl">{p.sub}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
