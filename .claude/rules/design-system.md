# Pocket — Design System Reference

Always-loaded rule (no `paths:` field → applies to every file). This is the single
source of truth for how Pocket looks, reads and behaves. Most relevant when working in
`src/components/ui/**`, `src/components/layout/**`, and any component or page.
Follow these rules in every component, page and PR — no exceptions.

---

## Brand

- **App name:** Pocket
- **Mark:** Eight-point asterisk (SVG, fill only, never stroked)
- **Wordmark:** `pocket` in lowercase, Quicksand 700, letter-spacing 0.07em
- **Logo rule:** Blue mark → white background only. White mark → blue, black, or yellow bg.
- **Never:** blue mark on black, blue mark on yellow, recolor the mark, rotate/stretch, add effects
- **Never hand-assemble the logo.** No raw `<img>` + `<span>` pairs, ever. Always
  `<Logo>` / `<AsteriskMark>` / `<Wordmark>` from `src/components/brand/`. There are
  no logo image files in this codebase — the mark is an SVG component and the
  wordmark is styled text; color comes from `className` (`currentColor`), never a
  separate raster per color. Changing the mark or wordmark means editing those 3
  files once — every usage site updates automatically.

---

## Typography

**Two families, strict roles:**

| Family | Role | Weight |
|---|---|---|
| Inter | All UI — titles, body, nav, tables, numbers | 400 / 500 / 600 / 700 |
| Quicksand | Logo wordmark + hero/landing headlines only | 700 |

**Type scale:**

| Token | Size | Weight | Notes |
|---|---|---|---|
| Page title | 24px | 600 | Dashboard, History, Planning, Investments |
| Card / section title | 18px | 600 | |
| KPI | 30px | 700 | `tabular-nums` required |
| Body | 14px | 400 | Default |
| Muted / subtitle | 14px | 400 | `muted-foreground` color |
| Label / overline | 12px | 500 | Uppercase, `letter-spacing: 0.07em` |
| Button | 14px | 500 | |
| Badge / pill | 12px | 500–600 | |

---

## Colors — Semantic Tokens (HSL CSS Variables)

Always reference tokens. Never hardcode hex values in components.

```css
/* Brand */
--brand-blue:   hsl(216 100% 55%);   /* #1B76FF */
--brand-yellow: hsl(45 100% 58%);    /* #FFD027 */
--brand-ink:    hsl(0 0% 3%);        /* #080808 */

/* Semantic */
--background:         hsl(0 0% 97%);         /* Page canvas */
--foreground:         hsl(0 0% 3%);          /* Primary text */
--card:               hsl(0 0% 100%);        /* Elevated surfaces */
--card-foreground:    hsl(0 0% 3%);
--primary:            hsl(216 100% 55%);     /* Blue — buttons, links, focus */
--primary-foreground: hsl(0 0% 100%);
--secondary:          hsl(45 100% 58%);      /* Yellow — secondary CTAs */
--secondary-foreground: hsl(0 0% 3%);
--accent:             hsl(216 100% 96%);     /* Blue tint — hover/active bg */
--accent-foreground:  hsl(216 100% 45%);
--muted:              hsl(0 0% 96%);
--muted-foreground:   hsl(0 0% 35%);         /* Subtitles, secondary labels */
--border:             hsl(0 0% 88%);
--input:              hsl(0 0% 88%);
--ring:               hsl(216 100% 55%);

/* Semantic — financial */
--success:            hsl(150 60% 38%);      /* Income, positive */
--success-foreground: hsl(0 0% 100%);
--destructive:        hsl(12 80% 46%);       /* Expenses, errors */
--destructive-foreground: hsl(0 0% 100%);
--warning:            hsl(45 100% 58%);      /* Transfers */
--warning-foreground: hsl(0 0% 3%);

--radius: 0.5rem; /* 8px base */
```

### Color semantics — financial data

| Type | Color token | Prefix | Notes |
|---|---|---|---|
| Income | `text-success` (green) | `+` | |
| Expense | `text-destructive` (red) | `−` | |
| Transfer | `text-muted-foreground` (grey) | ArrowRightLeft icon, no sign | |
| Zero (0,00) | `text-muted-foreground` (grey) | — | **Never green or red** |

---

## Number & Currency Format

```
$1.002,85
```

- Currency symbol: `$` prefix (locale-dependent in production, use `$` as default)
- Thousands: `.` (period)
- Decimals: `,` (comma), always 2 digits
- Font: `font-variant-numeric: tabular-nums` on every amount
- `Intl.NumberFormat` option: `useGrouping: 'always'`

---

## Transaction Table Columns

`#` · `Date` · `Description` · `Account` · `Movement` · `Category` · `Amount`

**Default sort:** Income → Transfer → Expense, then date descending.

### Two badge types — never confuse them

**Movement badges (solid fill):**
```
Income   → bg-success   text-white  font-600  prefix +
Expense  → bg-destructive text-white font-600 prefix −
Transfer → bg-warning   text-ink    font-600  ArrowRightLeft icon, no prefix
```

**Category pills (15% tint):**
```
background: hsl(var(--category-{slug}) / 0.15)
color:       darkened variant of the same hue
dot:         full-strength category color, 6–8px, rounded
```

---

## Category Colors

```css
/* Income */
--category-salary:          hsl(45 100% 58%);
--category-freelance:       hsl(260 60% 62%);
--category-investment:      hsl(216 75% 42%);
--category-rents:           hsl(32 90% 52%);
--category-refunds:         hsl(190 80% 42%);
--category-other-income:    hsl(220 10% 50%);

/* Expenses */
--category-housing:         hsl(14 80% 56%);
--category-groceries:       hsl(145 55% 40%);
--category-restaurants:     hsl(25 95% 55%);
--category-transport:       hsl(210 85% 52%);
--category-health:          hsl(350 72% 55%);
--category-entertainment:   hsl(285 65% 60%);
--category-shopping:        hsl(330 75% 58%);
--category-education:       hsl(198 85% 40%);
--category-subscriptions:   hsl(250 60% 60%);
--category-travel:          hsl(170 70% 38%);
--category-sports:          hsl(95 55% 38%);
--category-pets:            hsl(35 85% 50%);
--category-other-expense:   hsl(220 10% 50%);

/* Transfers */
--category-own-transfer:       hsl(220 12% 48%);
--category-to-investment:      hsl(216 75% 42%);
--category-to-joint-account:   hsl(200 85% 46%);
```

---

## Spacing & Layout

- Base grid: **4px**
- Default gap between cards: **24px (gap-6)**
- Container padding: **32px**
- Border radius scale: sm 4px · md 6px · lg 8px · xl 12px · 2xl 16px
- Pill/badge radius: 9999px

---

## Shadows

```css
--shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.04);
--shadow-card: 0 1px 2px 0 rgb(0 0 0 / 0.04), 0 4px 12px -2px rgb(0 0 0 / 0.06);
--shadow-lg:   0 6px 16px -4px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04);
```

---

## Icons

- Library: **Lucide** exclusively
- Style: `stroke-width="2"` · `stroke-linecap="round"` · `stroke-linejoin="round"` · `fill="none"`
- Grid: 24×24
- Sizes: 16px badges · 20px inline · 24px default · 32px stat cards
- Color: `currentColor` always
- **No emoji anywhere in the UI**

---

## The Pocket Triangle

A right triangle (half-square) extracted from the negative space of the asterisk mark.

```
Original orientation: top-left (0,0) · top-right (W,0) · bottom-right (W,H)
```

**Orientations:**
- `up` = rotate original 90° CCW
- `right` = original orientation
- `down` = rotate original 90° CW (mirror of up)
- `left` = rotate original 180°

**Usage (max 1–2 contexts per screen):**
- Trend up → green, `up` orientation — replaces chevron on stat cards
- Trend down → red, `down` orientation
- % change badge → green triangle + number, no `+` sign
- Empty state icon → outline, original orientation, primary color
- Bullet / step accent → yellow, original orientation

---

## Navigation (Sidebar)

**On blue background (`bg-primary`):**
- Icon size: 20px Lucide
- Active: white 100% + rounded bg `rgba(255,255,255,0.22)` · radius 9px · label Inter 600
- Inactive: white 52% opacity · no bg · label Inter 400
- Group labels: 9px · Inter 700 · white 45% · uppercase · tracking-wide
- Active = icon AND label both at full white. Never one without the other.

**On white/light background:**
- Active: `bg-accent` tint + `text-primary` (icon + label)
- Inactive: no bg + `text-muted-foreground`

---

## Component Rules

### Buttons
Variants: `default` (primary) · `secondary` · `outline` · `ghost` · `destructive` · `link` · `gradient`
Sizes: `sm` · `default` · `lg` · `icon`
All via tokens — never hardcoded colors.

### Cards (Stat)
Structure: `tinted bg (token/10%)` → uppercase label → KPI number → sparkline strip
Label, KPI and sparkline always use the same semantic token. Never hardcode colors in charts.

### Custom category colors (picker)
24 pre-defined options. **Never include:** black, white, income green, expense red, brand blue, brand yellow, grey/silver, gold/metallic.

---

## Patterns (Shape System)

Use sibling marks for backgrounds/textures. **Never tile the Asterisk mark.**

| Mark | Arms | Use for |
|---|---|---|
| Plus | 4 (0°/90°) | Page fills, card backgrounds |
| Tristar | 6 (60°/120°) | Dark hero sections, blue sidebar |
| Cross | 4 (45°/135°) | Yellow accent areas |
| Dash | 1 bar | Dividers, quiet accents |

Pattern opacity: 10–40% max. Single fill color per tile. Always brand palette.

---

## Hard Rules

1. Tokens, never hex — `bg-card` not `#fff`
2. Zero is always `text-muted-foreground` — never red or green
3. Blue mark → white background only, always
4. `tabular-nums` on every monetary amount
5. `font-variant-numeric: tabular-nums` in every table cell with numbers
6. Lucide icons only — no emoji, no other icon libraries
7. Never tile the Asterisk mark in patterns
8. Quicksand 700 → wordmark and hero headlines only
9. Charts/sparklines → always use `hsl(var(--success))` / `hsl(var(--destructive))` — never raw CSS colors
