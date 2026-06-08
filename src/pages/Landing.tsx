import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { MarqueeSection } from "@/components/landing/MarqueeSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
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

        {/* Marquee — sits right after hero, not sticky */}
        <div className="relative" style={{ zIndex: 5 }}>
          <MarqueeSection />
        </div>

        {/* Sticky stacking sections */}
        <StickyStack index={10}>
          <HowItWorksSection />
        </StickyStack>
        <StickyStack index={20}>
          <FeaturesSection />
        </StickyStack>
        <StickyStack index={30}>
          <ContactSection />
        </StickyStack>
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
