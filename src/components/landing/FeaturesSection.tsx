import { useInView } from "@/hooks/useInView";
import { TrendingUp, ShieldCheck } from "lucide-react";

function FloatingCard({
  delay,
  rotate = 0,
  className,
  children,
}: {
  delay: number;
  rotate?: number;
  className: string;
  children: React.ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out will-change-transform`}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: inView ? 1 : 0,
        transform: inView
          ? `translate3d(0, 0, 0) rotate(${rotate}deg) scale(1)`
          : `translate3d(0, 40px, 0) rotate(${rotate}deg) scale(0.9)`,
      }}
    >
      {children}
    </div>
  );
}

/* Mini phone mockup showing a Pocket-style dashboard */
function PhoneMockup() {
  const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95];

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 lg:w-72 h-[400px] lg:h-[500px] rounded-[2.5rem] bg-[#080808] p-[10px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)]">
      {/* Screen */}
      <div className="w-full h-full rounded-[2rem] bg-white overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <div className="text-[9px] font-bold text-[#080808]">9:41</div>
          <div className="w-16 h-3.5 bg-[#080808] rounded-full" />
          <div className="flex gap-1">
            <div className="w-3 h-2 bg-[#e5e5e5] rounded-sm" />
            <div className="w-1.5 h-2 bg-[#080808] rounded-sm" />
          </div>
        </div>

        {/* Header */}
        <div className="px-4 pt-1 pb-3 border-b border-[#f0f0f0]">
          <div className="text-[9px] text-[#9ca3af] mb-0.5">This month</div>
          <div className="text-xl font-black text-[#080808] leading-none">€4,280.50</div>
          <div className="text-[9px] text-[#16a34a] font-semibold mt-0.5">↑ 12% vs last month</div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-px bg-[#f0f0f0] mx-4 mt-3 rounded-xl overflow-hidden">
          <div className="bg-white px-3 py-2 text-center">
            <div className="text-[8px] text-[#9ca3af]">Income</div>
            <div className="text-xs font-black text-[#16a34a]">+€5.200</div>
          </div>
          <div className="bg-white px-3 py-2 text-center">
            <div className="text-[8px] text-[#9ca3af]">Expenses</div>
            <div className="text-xs font-black text-[#dc2626]">−€919</div>
          </div>
        </div>

        {/* Transactions */}
        <div className="flex-1 px-4 mt-3 space-y-2 overflow-hidden">
          <div className="text-[8px] text-[#9ca3af] font-bold uppercase tracking-wider">Recent</div>
          {[
            { name: "Mercadona", cat: "Groceries", amount: "−€68", dot: "#16a34a" },
            { name: "Salary", cat: "Income", amount: "+€3.200", dot: "#1b76ff" },
            { name: "Cabify", cat: "Transport", amount: "−€14", dot: "#f97316" },
            { name: "Netflix", cat: "Subs", amount: "−€16", dot: "#dc2626" },
          ].map((t) => (
            <div key={t.name} className="flex items-center gap-2 py-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.dot }} />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-semibold text-[#080808] truncate">{t.name}</div>
                <div className="text-[8px] text-[#9ca3af]">{t.cat}</div>
              </div>
              <div className="text-[9px] font-bold text-[#080808]">{t.amount}</div>
            </div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div className="px-4 pb-4 mt-2">
          <div className="text-[8px] text-[#9ca3af] mb-1.5">Daily spending</div>
          <div className="flex items-end gap-0.5 h-10">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${h}%`, background: i === 11 ? "#FFBB03" : "#1b76ff", opacity: i === 11 ? 1 : 0.5 + (i / bars.length) * 0.5 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section data-nav-theme="light" className="bg-white py-24 lg:py-40 overflow-hidden">
      <div className="container px-6">
        {/* Headline */}
        <div className="relative text-center max-w-6xl mx-auto">
          <h2
            className="font-black uppercase leading-[0.92] tracking-tight"
            style={{ fontSize: "clamp(2.25rem, 8vw, 7rem)" }}
          >
            <span style={{ color: "#1b76ff" }}>Whether you spend,</span>
            <br />
            <span style={{ color: "#FFBB03" }}>save or invest,</span>
            <br />
            <span style={{ color: "#080808" }}>pocket has you</span>
            <br />
            <span style={{ color: "#080808" }}>covered.</span>
          </h2>
        </div>

        {/* Phone + cards cluster */}
        <div className="relative mt-24 lg:mt-32 mx-auto max-w-5xl h-[440px] lg:h-[540px]">
          <PhoneMockup />

          {/* Left — salary */}
          <FloatingCard
            delay={100}
            rotate={-5}
            className="hidden md:block absolute left-0 top-6 w-56 bg-white rounded-2xl shadow-xl border border-[#f0f0f0] p-4"
          >
            <div className="text-[10px] text-[#6b7280] font-semibold mb-1">March salary</div>
            <div className="text-lg font-black text-[#16a34a]">+€3.200,00</div>
            <div className="mt-2 flex gap-1">
              {[30, 50, 45, 70, 60, 80].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#16a34a]/30" style={{ height: h * 0.3 + 6 }} />
              ))}
            </div>
          </FloatingCard>

          {/* Right top — category */}
          <FloatingCard
            delay={200}
            rotate={6}
            className="hidden md:block absolute right-0 top-10 w-52 bg-[#FFBB03] rounded-2xl shadow-xl p-4"
          >
            <div className="text-[10px] text-[#080808]/60 font-black tracking-widest mb-1">GROCERIES</div>
            <div className="text-lg font-black text-[#080808]">€420 this month</div>
            <div className="mt-2 text-xs text-[#080808]/60">↓ 8% vs last month</div>
          </FloatingCard>

          {/* Left bottom — investments */}
          <FloatingCard
            delay={300}
            rotate={4}
            className="hidden md:block absolute left-4 bottom-6 w-56 bg-[#080808] text-white rounded-2xl shadow-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#FFBB03]" />
              <div className="text-[10px] text-white/60 font-black tracking-widest">INVESTMENTS</div>
            </div>
            <div className="text-lg font-black">Portfolio +4.2%</div>
            <div className="text-xs text-white/50 mt-1">€24,800 total value</div>
          </FloatingCard>

          {/* Right bottom — AI tag */}
          <FloatingCard
            delay={400}
            rotate={-4}
            className="hidden md:block absolute right-2 bottom-10 w-52 bg-white rounded-2xl shadow-xl border border-[#f0f0f0] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#1b76ff]" />
              <div className="text-[10px] text-[#6b7280] font-semibold">Auto-categorized</div>
            </div>
            <div className="text-sm font-bold text-[#080808]">Restaurant · Food</div>
            <div className="text-xs text-[#1b76ff] mt-1 font-semibold">AI matched · 98% sure</div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
