import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL as string | undefined;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;

const FEATURES = [
  "Upload any bank statement — PDF, CSV, Excel",
  "Every transaction categorized automatically",
  "Investment portfolio tracking built in",
  "Savings goals and budget planning",
];

const STATS = [
  { value: "30s",  label: "to upload your first statement" },
  { value: "100%", label: "automatic categorization"       },
  { value: "Free", label: "forever to get started"         },
];

export function CTASection() {
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleViewDemo = async () => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return;
    setDemoLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    setDemoLoading(false);
    if (!error) navigate("/dashboard");
  };

  return (
    <section
      data-nav-theme="dark"
      className="relative overflow-hidden"
      style={{ background: "#1b76ff" }}
    >
      <div
        className="grid lg:grid-cols-[3fr_2fr]"
        style={{ minHeight: "90vh" }}
      >
        {/* ── Left: the message ─────────────────────────────────────────── */}
        <div
          className="flex flex-col justify-center"
          style={{
            padding: "clamp(5rem, 8vw, 8rem) clamp(1.5rem, 5vw, 4.5rem) clamp(5rem, 8vw, 8rem) clamp(1.5rem, 5vw, 4.5rem)",
          }}
        >
          <p className="text-[10px] font-bold tracking-[0.32em] text-white/55 uppercase mb-6">
            Ready to start
          </p>

          <h2
            className="font-heading font-bold text-white uppercase leading-[0.9] tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
          >
            Know where<br />
            every euro<br />
            actually goes.
          </h2>

          <p
            className="text-white/70 leading-relaxed mt-8"
            style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)", maxWidth: "44ch" }}
          >
            Upload your bank statement and pocket maps out your spending, tracks
            your investments, and shows you the full picture — automatically.
          </p>

          {/* Feature checklist */}
          <ul className="mt-10 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span
                  className="shrink-0 flex items-center justify-center rounded-full"
                  style={{ width: 22, height: 22, background: "rgba(255,255,255,0.18)" }}
                >
                  <Check className="text-white" style={{ width: 12, height: 12 }} strokeWidth={3} />
                </span>
                <span className="text-white/80 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Right: action + stats ──────────────────────────────────────── */}
        <div
          className="flex flex-col justify-center items-start lg:items-center"
          style={{
            padding: "clamp(3rem, 6vw, 6rem) clamp(1.5rem, 5vw, 4.5rem)",
            borderLeft: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* App mark */}
          <div className="mb-10">
            <img
              src="/logos/isologo-white.png"
              alt="pocket"
              style={{ width: 52, height: 52, opacity: 0.9, objectFit: "contain" }}
            />
          </div>

          {/* CTA button */}
          <Link
            to="/auth"
            className="w-full max-w-[280px] flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all hover:scale-[1.02] hover:shadow-2xl"
            style={{
              background: "#ffffff",
              color: "#080808",
              fontSize: "1rem",
              padding: "1.1rem 2rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            Create your free account
          </Link>

          <p className="mt-4 text-white/45 text-xs text-center w-full max-w-[280px]">
            No credit card required
          </p>

          {DEMO_EMAIL && DEMO_PASSWORD && (
            <button
              type="button"
              onClick={handleViewDemo}
              disabled={demoLoading}
              className="mt-5 w-full max-w-[280px] flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all hover:bg-white/10 disabled:opacity-60"
              style={{
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#ffffff",
                fontSize: "0.95rem",
                padding: "1rem 2rem",
              }}
            >
              {demoLoading ? "Loading demo…" : "View live demo"}
            </button>
          )}

          {/* Stats */}
          <div className="mt-14 space-y-5 w-full max-w-[280px]">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-baseline gap-3">
                <span
                  className="font-black text-white tabular-nums shrink-0"
                  style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}
                >
                  {s.value}
                </span>
                <span className="text-white/50 text-sm leading-snug">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ghost "POCKET" watermark at bottom */}
      <div
        className="pointer-events-none select-none overflow-hidden"
        style={{ marginTop: "-2rem" }}
      >
        <div
          className="font-black uppercase text-white leading-[0.82] tracking-tight"
          style={{ fontSize: "clamp(5rem, 24vw, 22rem)", opacity: 0.07 }}
        >
          POCKET
        </div>
      </div>
    </section>
  );
}
