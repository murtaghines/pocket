import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { AppShowcaseSection } from "@/components/landing/AppShowcaseSection";
import { StatementSection } from "@/components/landing/StatementSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { StickyStack } from "@/components/landing/StickyStack";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <LandingHeader />
      <main className="relative">
        {/* Hero — base layer */}
        <div className="relative" style={{ zIndex: 0 }}>
          <HeroSection />
        </div>

        {/* App Showcase — 3 browser mockups on yellow */}
        <StickyStack index={10}>
          <AppShowcaseSection />
        </StickyStack>

        {/* Statement — big bold text on white */}
        <StickyStack index={20}>
          <StatementSection />
        </StickyStack>

        {/* Dashboard showcase — dark with large browser mockup */}
        <StickyStack index={30}>
          <ContactSection />
        </StickyStack>

        {/* CTA */}
        <StickyStack index={40}>
          <CTASection />
        </StickyStack>
      </main>

      <div className="relative" style={{ zIndex: 50 }}>
        <LandingFooter />
      </div>
    </div>
  );
}
