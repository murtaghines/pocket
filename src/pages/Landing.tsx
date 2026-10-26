import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import i18n from "@/i18n/config";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { TransitionSection } from "@/components/landing/TransitionSection";
import { AppShowcaseSection } from "@/components/landing/AppShowcaseSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  const { t } = useTranslation('auth');
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('i18nextLng');
      if (saved && ['en', 'es'].includes(saved)) return saved as SupportedLanguage;
    } catch { /* ignore */ }
    return (i18n.language || 'en') as SupportedLanguage;
  });
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as SupportedLanguage);
    i18n.changeLanguage(lang);
    try { localStorage.setItem('i18nextLng', lang); } catch { /* ignore */ }
  };

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-nav-theme]")
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);
        const target = visible[0]?.target as HTMLElement | undefined;
        if (target) {
          const t = target.getAttribute("data-nav-theme");
          if (t === "light" || t === "dark") setTheme(t);
        }
      },
      { rootMargin: "-85% 0px -20px 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const isDark = theme === "dark";
  const textActive = isDark ? "text-white font-medium" : "text-foreground font-medium";
  const textInactive = isDark ? "text-white/50 hover:text-white/70" : "text-foreground/40 hover:text-foreground/60";
  const textSep = isDark ? "text-white/30" : "text-foreground/20";
  const iconClass = isDark ? "text-white/50" : "text-foreground/40";

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      <LandingHeader />
      <main>
        <HeroSection />
        {/* Transition: blue section with animated pocket logo before content */}
        <TransitionSection />
        {/* White card slides up with rounded top corners */}
        <AppShowcaseSection />
        <ContactSection />
        <CTASection />
      </main>
      <LandingFooter />

      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-4 text-sm pointer-events-none transition-colors duration-300">
        <div className="pointer-events-auto flex items-center gap-2">
          <Globe className={`w-3.5 h-3.5 transition-colors duration-300 ${iconClass}`} />
          {SUPPORTED_LANGUAGES.map((lang, idx) => (
            <span key={lang.code} className="flex items-center gap-2">
              {idx > 0 && <span className={`transition-colors duration-300 ${textSep}`}>|</span>}
              <button
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`transition-colors duration-300 ${language === lang.code ? textActive : textInactive}`}
              >
                {t(`languages.${lang.code}`)}
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
