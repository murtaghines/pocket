
# Landing redesign — playful, bold, Unipay-inspired

Rework `src/pages/Landing.tsx` and its section components into a full-bleed, color-blocked, massive-typography journey. Same visual rhythm as the Unipay reference (huge headlines, alternating full-color sections, ghost text overlays, oversized illustrations, dark "benefits" block, final big CTA), but every word reframed for Pocket: upload statements, auto-categorize with AI, see all your money + investments in one place.

## Brand palette (reuse existing tokens)

- Pocket Blue `#3391D0` (primary) — hero & final CTA blocks
- Deep Navy `#0F4264` — dark "Our benefits" block & dark headlines on white
- Sun Yellow `#FDB813` — "playful" feature blocks (in place of Unipay's yellow)
- White / Light Gray `#f5f5f5` — breathing rooms
- Soft pastel pinks/blues only as decorative cloud accents (already in assets)

Pocket logo: white version on blue/navy/yellow; blue version on white/gray. Already in `src/assets`.

## Section-by-section structure

```text
1. Sticky transparent header        → reuse LandingHeader (logo + "Get started" pill)
2. HERO  (blue full-bleed)          → "TRACK YOUR MONEY LIKE NEVER BEFORE"
3. FEATURE BLOCKS (yellow stack)    → 3 stacked yellow panels with cute illustrations
4. RAINBOW TYPE BLOCK (white)       → overlapping color headline
5. PHONE MOCKUP (white)             → centered mockup of dashboard
6. CARDS GRID (white)               → floating cards: balance, accounts, categories
7. BENEFITS (navy / near-black)     → "Our benefits" with mockup cards
8. SOCIAL PROOF + CTA (blue)        → "Join thousands" + big "GET STARTED" wordmark
9. Footer                           → reuse LandingFooter
```

### 2. HERO — full-bleed Pocket Blue
- Top-left: small `pocket` logo (white)
- Top-right: pill button "Get started" (white bg, blue text)
- Massive headline (≈12vw, white): `TRACK YOUR MONEY LIKE NEVER BEFORE`
- Below the fold of the headline, a faded translucent repeat of the same words as Unipay does (`text-white/25`)
- Top-right small column: `DO MORE WITH POCKET` label + 3-line paragraph: "Upload bank statements, auto-categorize every transaction with AI, and see your full financial picture in one place."
- Floating "QR-style" card (left, mid-headline): replace QR with Pocket icon + tiny "Free forever" badge

### 3. FEATURE BLOCKS — yellow full-bleed stack (3 stacked panels)
Each panel = full-width yellow `#FDB813`, big black headline centered, playful illustration peeking from edges (reuse `pocket-icon` cloud + simple SVG phone/card shapes built inline — no new image generation needed).
- Panel A: `Upload any bank statement` (Excel, PDF — drag & drop)
- Panel B: `Auto-categorized by AI` (every transaction, instantly)
- Panel C: `All your accounts in one place` (banks, cash, investments)

### 4. RAINBOW TYPE BLOCK — white background
Centered massive headline with overlapping blue + yellow + navy glyphs (CSS `mix-blend-multiply` between two stacked `<h2>` layers):
`WHETHER YOU SPEND, SAVE OR INVEST, POCKET HAS YOU COVERED.`

### 5. PHONE MOCKUP — white, centered
Single phone frame (CSS-built, no asset) showing dashboard preview reused from current `HeroSection`'s mock chrome but stripped to just the phone silhouette + balance card + small bar chart.

### 6. CARDS GRID — white, asymmetric floating cards
Mimics Unipay's scattered card cluster. 4–5 small cards float around a central phone:
- "Balance €12,480.50"
- "Groceries · €420"
- "Investments +4.2%"
- "Salary received +€3,200"
- Tiny notification card
All built with existing `bg-card`/`border` primitives, slight rotations.

### 7. BENEFITS — navy `#0F4264` (almost black)
- Section title white: `Our benefits`
- 3 floating cards (white) with phone-notification look:
  - `Instant categorization`
  - `Spot trends in seconds`
  - `Multi-currency, multi-bank`
- Below: small `PRIVATE BY DEFAULT` label + line "Your data is encrypted and never shared."

### 8. FINAL CTA — Pocket Blue full-bleed
- Centered tiny eyebrow: `JOIN PEOPLE TAKING CONTROL`
- Massive wordmark `START WITH POCKET` (white, like Unipay's "DOWNLOAD APP UNIPAY")
- Pill button: "Sign up for free" (white bg, blue text) → `/auth`
- Bottom: faux progress "100%" with Pocket asterisk-like glyph (reuse `pocket-icon` white)

### 9. Footer
Keep existing `LandingFooter`.

## Files to change / create

- **Replace** `src/components/landing/HeroSection.tsx` — new blue full-bleed hero
- **Replace** `src/components/landing/HowItWorksSection.tsx` → rename concept to `FeatureStackSection.tsx` (yellow stacked panels). Keep file name to avoid wider refactor; restructure internals.
- **Replace** `src/components/landing/FeaturesSection.tsx` → becomes the rainbow-type + cards grid block
- **Replace** `src/components/landing/ContactSection.tsx` → becomes the navy "Our benefits" block
- **Replace** `src/components/landing/CTASection.tsx` → final blue mega-CTA
- **Light edit** `src/pages/Landing.tsx` — keep section order, ensure no light/dark mismatch (force `bg-white text-foreground` already there)
- **No changes** to `LandingHeader`, `LandingFooter`, assets, or any app/dashboard code.

## Technical notes

- All colors via inline hex matching existing landing convention (the landing already uses `#0F4264`, `#FDB813` directly — keep consistent rather than introducing new tokens).
- Typography: use existing font stack; bump display sizes to `clamp(3rem, 12vw, 12rem)` with `font-bold tracking-tight leading-[0.9]` for the Unipay-esque feel.
- Responsive: stack everything single-column under `md`, reduce display headline to `clamp(2.5rem, 14vw, 5rem)`.
- Decorative shapes: pure CSS divs + SVG circles, plus existing `pocket-icon.png` for the asterisk glyph. No image generation.
- All CTAs link to `/auth` (existing pattern).

## Out of scope

- No changes to dashboard, auth, or backend.
- No new assets generated; reuse `pocket-icon.png`, `pocket-logo-white.png`, `pocket-logo-blue.png`.
- Copy stays in English (matches current landing rule).
