import { FileSpreadsheet, Sparkles, Wallet } from "lucide-react";
import pocketIcon from "@/assets/pocket-icon.png";
import { useScrollProgress } from "@/hooks/useScrollProgress";

/* ── Visual mockups for each step ─────────────────────────────────────────── */

function UploadVisual() {
  return (
    <div className="hidden lg:block absolute right-10 xl:right-16 top-1/2 -translate-y-1/2 z-20">
      <div
        className="bg-white rounded-2xl shadow-2xl p-5 w-64"
        style={{ transform: "rotate(3deg)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#1b76ff]/10 rounded-lg flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-[#1b76ff]" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#080808] leading-tight">bank_statement.xlsx</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">January 2025</div>
          </div>
        </div>
        <div className="h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full bg-[#1b76ff]" style={{ width: "100%" }} />
        </div>
        <div className="text-[11px] text-[#16a34a] font-semibold">✓ 142 transactions imported</div>
      </div>

      <div
        className="bg-[#080808] rounded-2xl shadow-xl p-4 w-52 mt-3 ml-8"
        style={{ transform: "rotate(-2deg)" }}
      >
        <div className="text-[10px] text-white/50 font-bold tracking-widest mb-1">ALSO IMPORTED</div>
        <div className="text-sm font-bold text-white">savings_dec.csv</div>
        <div className="text-[11px] text-white/50 mt-0.5">68 transactions</div>
      </div>
    </div>
  );
}

function CategorizeVisual() {
  const transactions = [
    { name: "Mercadona", cat: "Groceries", color: "#16a34a", amount: "−€92,40" },
    { name: "Cabify Express", cat: "Transport", color: "#1b76ff", amount: "−€14,20" },
    { name: "Salary — March", cat: "Income", color: "#ca8a04", amount: "+€3.200" },
    { name: "Netflix", cat: "Subscriptions", color: "#dc2626", amount: "−€15,99" },
  ];

  return (
    <div className="hidden lg:block absolute right-10 xl:right-16 top-1/2 -translate-y-1/2 z-20 space-y-2">
      {transactions.map((t, i) => (
        <div
          key={t.name}
          className="bg-white rounded-xl shadow-lg px-4 py-3 flex items-center justify-between gap-6 w-72"
          style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#080808] truncate">{t.name}</div>
            <div
              className="text-[11px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded-full"
              style={{ color: t.color, background: `${t.color}18` }}
            >
              {t.cat}
            </div>
          </div>
          <div className="text-xs font-bold text-[#080808] shrink-0">{t.amount}</div>
        </div>
      ))}
    </div>
  );
}

function AccountsVisual() {
  const accounts = [
    { bank: "BBVA", balance: "€2,480.50", bg: "#1b76ff", dark: false },
    { bank: "Sabadell", balance: "€8,120.00", bg: "#080808", dark: false },
    { bank: "N26", balance: "€950.30", bg: "#FFBB03", dark: true },
  ];

  return (
    <div className="hidden lg:block absolute right-10 xl:right-16 top-1/2 -translate-y-1/2 z-20">
      <div className="relative" style={{ width: 260, height: 200 }}>
        {accounts.map((acc, i) => (
          <div
            key={acc.bank}
            className="absolute left-0 rounded-2xl shadow-xl p-4 w-60 flex items-center justify-between"
            style={{
              top: i * 56,
              background: acc.bg,
              transform: `rotate(${i === 0 ? -3 : i === 1 ? 1 : -1}deg)`,
              zIndex: accounts.length - i,
            }}
          >
            <div className="font-bold text-sm" style={{ color: acc.dark ? "#080808" : "white" }}>
              {acc.bank}
            </div>
            <div className="font-black text-sm" style={{ color: acc.dark ? "#080808" : "rgba(255,255,255,0.9)" }}>
              {acc.balance}
            </div>
          </div>
        ))}
      </div>

      <div
        className="bg-white rounded-xl shadow-xl p-4 w-60 mt-4 flex items-center justify-between"
        style={{ transform: "rotate(1.5deg)" }}
      >
        <div className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">Total balance</div>
        <div className="text-sm font-black text-[#080808]">€11,550.80</div>
      </div>
    </div>
  );
}

/* ── Panels config ─────────────────────────────────────────────────────────── */

const panels = [
  {
    title: "Upload any bank statement",
    sub: "Excel or CSV. Drag, drop, done.",
    Icon: FileSpreadsheet,
    Visual: UploadVisual,
  },
  {
    title: "Auto-categorized by AI",
    sub: "Every transaction sorted instantly.",
    Icon: Sparkles,
    Visual: CategorizeVisual,
  },
  {
    title: "All your accounts in one place",
    sub: "Banks, cash and investments — together.",
    Icon: Wallet,
    Visual: AccountsVisual,
  },
];

function Panel({ p, i }: { p: (typeof panels)[number]; i: number }) {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const iconY = progress * -30;
  const labelY = progress * -10;

  return (
    <div
      ref={ref}
      className="relative overflow-hidden border-b border-black/5"
      style={{ background: "#FFBB03" }}
    >
      {/* Decorative dots */}
      <div className="absolute top-8 right-12 w-4 h-4 rounded-full bg-white/60" />
      <div className="absolute bottom-12 left-16 w-6 h-6 rounded-full bg-[#080808]/20" />
      <div className="absolute top-1/2 right-1/3 w-3 h-3 rounded-full bg-[#1b76ff]/40" />

      {/* Pocket watermark */}
      <img
        src={pocketIcon}
        alt=""
        className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 pointer-events-none will-change-transform"
        style={{ transform: `translate3d(0, ${progress * -20}px, 0) rotate(${progress * 8}deg)` }}
      />

      {/* Right visual */}
      <p.Visual />

      <div className="container px-6 py-20 lg:py-32 relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12 lg:max-w-[60%]">
          {/* Icon block */}
          <div
            className="shrink-0 w-32 h-32 lg:w-44 lg:h-44 rounded-3xl bg-[#080808] flex items-center justify-center shadow-xl will-change-transform"
            style={{ transform: `translate3d(0, ${iconY}px, 0) rotate(-6deg)` }}
          >
            <p.Icon className="w-14 h-14 lg:w-20 lg:h-20 text-white" strokeWidth={1.5} />
          </div>

          {/* Text */}
          <div
            className="flex-1 will-change-transform"
            style={{ transform: `translate3d(0, ${labelY}px, 0)` }}
          >
            <div className="text-xs font-bold tracking-[0.25em] text-[#080808]/60 mb-3">
              STEP {String(i + 1).padStart(2, "0")}
            </div>
            <h3
              className="font-black text-[#080808] uppercase leading-[0.92] tracking-tight"
              style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)" }}
            >
              {p.title}
            </h3>
            <p className="mt-4 text-lg lg:text-xl text-[#080808]/75 max-w-lg">{p.sub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section data-nav-theme="light" className="bg-white">
      {panels.map((p, i) => (
        <Panel key={p.title} p={p} i={i} />
      ))}
    </section>
  );
}
