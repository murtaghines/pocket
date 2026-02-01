

# Plan: Dashboard Light Theme Redesign

## Overview
Transform the dashboard (`/dashboard` route) from a dark theme to a clean, professional light theme with a white background. The design will use black for primary text, blue (`#1b17ff`) for accents/buttons, and subtle grays for secondary elements. The landing page and authentication pages will remain untouched.

---

## Strategy: CSS Custom Properties with Dashboard-Specific Class

The best approach is to create a `.dashboard-theme` class that overrides the CSS variables specifically for the dashboard pages. This keeps the landing page dark theme intact while giving the dashboard a completely different look.

---

## Files to Modify

### 1. `src/index.css` - Add Light Theme Variables
Add a new `.dashboard-theme` class with light mode color variables:

```css
.dashboard-theme {
  --background: 0 0% 100%;        /* Pure white */
  --foreground: 0 0% 9%;          /* Near black */
  
  --card: 0 0% 100%;              /* White cards */
  --card-foreground: 0 0% 9%;
  
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 9%;
  
  --primary: 242 100% 55%;        /* Keep primary blue */
  --primary-foreground: 0 0% 100%;
  
  --secondary: 0 0% 96%;          /* Light gray */
  --secondary-foreground: 0 0% 9%;
  
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;   /* Medium gray */
  
  --accent: 0 0% 96%;
  --accent-foreground: 0 0% 9%;
  
  --border: 0 0% 90%;             /* Light borders */
  --input: 0 0% 90%;
  --ring: 242 100% 55%;
  
  /* Updated shadows for light theme */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### 2. `src/pages/Index.tsx` - Apply Dashboard Theme
Wrap the dashboard page in the `dashboard-theme` class:

```tsx
<div className="min-h-screen bg-background pb-20 md:pb-0 dashboard-theme">
```

### 3. `src/components/layout/Header.tsx` - Light Theme Header
- Change background from dark blur to white/light blur
- Use dark (black) logo instead of white logo
- Update text colors to black/gray
- Keep blue accent for active navigation items

Key changes:
- Import `wallet-text-black.png` instead of white
- Update header background: `bg-white/95 backdrop-blur-xl border-b border-gray-200`
- Button text: dark colors, active state uses blue

### 4. `src/components/layout/MobileBottomNav.tsx` - Light Theme Mobile Nav
- Change from blue background to white
- Use dark icons and text
- Active state: blue text instead of white on blue

### 5. `src/components/layout/CurrencySelector.tsx` - Light Theme Selector
- Ensure dropdown works with light theme colors
- Dark text, light backgrounds

---

## Color Palette for Dashboard

| Element | Color |
|---------|-------|
| Background | White (`#FFFFFF`) |
| Primary Text | Near Black (`#171717`) |
| Secondary Text | Medium Gray (`#737373`) |
| Borders | Light Gray (`#E5E5E5`) |
| Cards | White with subtle shadow |
| Primary/Accent | Blue (`#1b17ff`) |
| Income | Green (keep current `hsl(160, 84%, 45%)`) |
| Expense | Red (keep current `hsl(0, 72%, 51%)`) |

---

## Components That Will Automatically Adapt

Because these components use semantic CSS variables (`text-foreground`, `bg-card`, `border-border`, etc.), they will automatically inherit the light theme:

- `StatCard` - Will show white cards with shadows
- `CategoryChart` - Tooltips will have light backgrounds
- `MonthlyChart` - Already uses HSL values for income/expense colors
- `TransactionTable` - Will have light table styling
- `EmptyStateBanner` - Blue accents will remain
- `MonthClosingBanner` - Blue gradient accents will adapt
- All other chart components

---

## Visual Result

The dashboard will transform to:
- Clean white background (differentiating from dark landing)
- Black text for headings and content
- Blue buttons and interactive elements
- Light gray borders and card shadows
- Income (green) and Expense (red) colors remain vibrant
- Professional, minimal appearance similar to modern fintech apps

---

## Technical Notes

1. **No changes to Landing/Auth pages** - They will continue using the root `:root` dark theme
2. **CSS Cascade** - `.dashboard-theme` class overrides variables only within its scope
3. **Logo Asset** - Already exists: `wallet-text-black.png` in `src/assets/`
4. **Mobile Nav** - Will need explicit styling updates since it uses `bg-primary`

