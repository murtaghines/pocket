# Epic: Landing page

## Main files
- src/pages/Landing.tsx
- src/components/landing/: HeroSection, AppShowcaseSection, TransitionSection,
  CTASection, ContactSection, LandingHeader, LandingFooter
- src/components/brand/: Logo, AsteriskMark, Wordmark (used throughout — never
  hand-assemble the logo here)

## Current state
<!-- fill in: what's done, what still needs polish -->

## Decisions made
- 2026-07-05: removed 5 dead components never wired into Landing.tsx
  (FeaturesSection, HowItWorksSection, MarqueeSection, StatementSection, StickyStack).
- 2026-07-05: TransitionSection now spins only the AsteriskMark on scroll (previously
  animated the full raster mark+wordmark lockup) — a deliberate visual change, not a
  1:1 migration.

## Next step
<!-- the first concrete task -->
