const items = [
  "Smart Categorization",
  "Multi-Account",
  "Real-time Insights",
  "Investment Tracking",
  "Zero Manual Entry",
  "Multi-Currency",
  "Privacy First",
  "Bank Statements",
  "AI-Powered",
  "Savings Rate",
];

export function MarqueeSection() {
  // Duplicate so the animation is seamless
  const doubled = [...items, ...items];

  return (
    <div
      className="overflow-hidden py-4 border-y-2 border-[#080808]/10"
      style={{ background: "#FFBB03" }}
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-5 px-5 text-[#080808] font-black uppercase tracking-[0.14em] text-sm lg:text-base"
          >
            <span className="text-[#080808]/30 text-xs">✦</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
