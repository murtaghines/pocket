import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
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
        {/* Hero is the base layer — no sticky wrap, lives at z-0 */}
        <div className="relative" style={{ zIndex: 0 }}>
          <HeroSection />
        </div>

        {/* Each subsequent section sticks to the top and covers the previous */}
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
