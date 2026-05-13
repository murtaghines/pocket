export function FeaturesSection() {
  return (
    <section data-nav-theme="light" className="bg-white py-24 lg:py-40 overflow-hidden">
      <div className="container px-6">
        {/* Overlapping rainbow headline */}
        <div className="relative text-center max-w-6xl mx-auto">
          <h2
            className="font-black uppercase leading-[0.92] tracking-tight"
            style={{
              fontSize: "clamp(2.25rem, 8vw, 7rem)",
              color: "#1b76ff",
            }}
          >
            Whether you spend,
            <br />
            <span style={{ color: "#FFBB03" }}>save or invest,</span>
            <br />
            <span style={{ color: "#080808" }}>pocket has you</span>
            <br />
            <span style={{ color: "#FFBB03" }}>covered.</span>
          </h2>
        </div>

        {/* Floating cards cluster */}
        <div className="relative mt-24 lg:mt-32 mx-auto max-w-5xl h-[420px] lg:h-[520px]">
          {/* Phone */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 lg:w-72 h-[400px] lg:h-[500px] rounded-[2.5rem] bg-[#080808] p-3 shadow-2xl">
            <div className="w-full h-full rounded-[2rem] bg-white p-4 flex flex-col gap-3">
              <div className="text-[10px] text-[#6b7280]">Total balance</div>
              <div className="text-2xl font-bold text-[#080808]">€12.480,50</div>
              <div className="h-px bg-[#e5e5e5] my-1" />
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span>Salary</span><span className="text-[#16a34a] font-semibold">+€3.200</span></div>
                <div className="flex justify-between"><span>Groceries</span><span className="text-[#dc2626] font-semibold">-€420</span></div>
                <div className="flex justify-between"><span>Transport</span><span className="text-[#dc2626] font-semibold">-€85</span></div>
                <div className="flex justify-between"><span>Investments</span><span className="text-[#16a34a] font-semibold">+4,2%</span></div>
              </div>
              <div className="mt-auto flex items-end gap-1 h-16">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-[#1b76ff]" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div className="hidden md:block absolute left-2 top-8 w-56 bg-white rounded-2xl shadow-xl border border-[#e5e5e5] p-4 rotate-[-6deg]">
            <div className="text-[10px] text-[#6b7280]">Salary received</div>
            <div className="text-lg font-bold text-[#16a34a]">+€3.200,00</div>
          </div>

          <div className="hidden md:block absolute right-4 top-12 w-52 bg-[#FFBB03] rounded-2xl shadow-xl p-4 rotate-[8deg]">
            <div className="text-[10px] text-[#080808]/70 font-bold tracking-widest">GROCERIES</div>
            <div className="text-lg font-bold text-[#080808]">€420 this month</div>
          </div>

          <div className="hidden md:block absolute left-8 bottom-8 w-56 bg-[#080808] text-white rounded-2xl shadow-xl p-4 rotate-[5deg]">
            <div className="text-[10px] text-white/60 font-bold tracking-widest">INVESTMENTS</div>
            <div className="text-lg font-bold">Portfolio +4,2%</div>
          </div>

          <div className="hidden md:block absolute right-2 bottom-12 w-52 bg-white rounded-2xl shadow-xl border border-[#e5e5e5] p-4 rotate-[-4deg]">
            <div className="text-[10px] text-[#6b7280]">New transaction</div>
            <div className="text-sm font-semibold text-[#080808]">Auto-categorized</div>
            <div className="text-xs text-[#1b76ff] mt-1">Restaurant · Food</div>
          </div>
        </div>
      </div>
    </section>
  );
}
