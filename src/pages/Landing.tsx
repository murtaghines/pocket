import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { AppShowcaseSection } from "@/components/landing/AppShowcaseSection";
import { StatementSection } from "@/components/landing/StatementSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <LandingHeader />
      <main>
        <HeroSection />
        <AppShowcaseSection />
        <StatementSection />
        <ContactSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
