import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { TransitionSection } from "@/components/landing/TransitionSection";
import { AppShowcaseSection } from "@/components/landing/AppShowcaseSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-foreground">
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
    </div>
  );
}
