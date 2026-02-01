
# Plan: Dashboard Modern Redesign - Inspired by Reference UI

## Overview
Transform the current dashboard to match the modern, card-based "bento grid" aesthetic from the reference image. The design will use the wallet brand colors (white background, black text, primary blue `#1b17ff` for accents) while maintaining all existing functionality.

---

## Design Analysis from Reference Image

Key visual characteristics to adopt:
- **Bento grid layout**: Mixed-size cards in a flexible grid pattern
- **Rounded corners**: More pronounced (xl to 2xl radius)
- **Soft shadows**: Subtle, almost flat cards with very light borders
- **Clean typography**: Large bold numbers, small muted labels
- **Accent circles/rings**: Decorative circular progress indicators
- **Minimal icons**: Small, subtle icons as visual accents
- **Breathing room**: More whitespace within cards
- **Pill buttons/badges**: Rounded pill-shaped interactive elements
- **Activity bars**: Mini bar charts inline with data

---

## Files to Modify

### 1. `src/index.css` - Enhanced Dashboard Theme
Update `.dashboard-theme` with softer styling:
- Increase border radius variables
- Add new shadow utilities for cards
- Softer border colors
- Add decorative gradient utilities

### 2. `src/pages/Index.tsx` - New Bento Grid Layout
Complete restructure of the dashboard layout:
- Add a welcome/date section at top
- Reorganize cards into a bento-style grid
- Add visual hierarchy with varied card sizes
- Group related metrics together

### 3. `src/components/dashboard/StatCard.tsx` - Modern Stat Card
Redesign to match reference:
- Larger, bolder value typography
- Icon in colored pill/circle badge
- Cleaner layout with more padding
- Optional mini chart/trend visualization
- Remove heavy colored backgrounds, use subtle accents

### 4. `src/components/dashboard/CategoryChart.tsx` - Enhanced Pie Chart
- Larger donut chart with center value
- Cleaner legend below
- Add total value in center of ring
- Softer colors for categories

### 5. `src/components/dashboard/MonthlyChart.tsx` - Refined Chart
- Cleaner bar/area styling
- Blue accent color for primary data
- Simplified axis styling
- Larger card with more breathing room

### 6. `src/components/dashboard/SavingsRateCard.tsx` - Ring Progress Card
- Keep the circular progress (matches reference "36% Growth rate")
- Update colors to use blue accent
- Clean center typography
- Add subtle animation

### 7. `src/components/dashboard/TopExpensesCard.tsx` - Activity List
- Cleaner list styling
- Rounded category badges
- Mini amount badges on right
- More compact rows

### 8. `src/components/dashboard/WeeklyComparisonChart.tsx` - Mini Bar Chart
- Cleaner mini bars
- Blue accent for today
- Simplified layout

### 9. `src/components/dashboard/BalanceChart.tsx` - Line Trend Chart
- Single-color line (blue)
- Subtle gradient fill
- Cleaner axis

### 10. `src/components/dashboard/InvestmentSummaryCard.tsx` - Investment Quick View
- Pill-style "View" button
- Cleaner typography
- Blue accent for values

### 11. `src/components/dashboard/MonthStatusIndicator.tsx` - Month Status Card
- Cleaner badge styling
- Blue accent theme
- Progress indicator

### 12. `src/components/dashboard/TransactionTable.tsx` - Modern Table
- Softer row styling
- Rounded pill badges for categories
- Cleaner typography
- Search with rounded input

### 13. `src/components/dashboard/EmptyStateBanner.tsx` - Welcome Card
- Softer styling
- Blue gradient accent
- Pill-style CTA button

### 14. `src/components/dashboard/MonthClosingBanner.tsx` - Notification Card
- Rounded, soft styling
- Blue theme instead of gradients
- Pill badges for status

### 15. `src/components/dashboard/YearlyBalanceChart.tsx` - Annual Overview
- Blue bars for positive months
- Cleaner legend
- Match reference "Annual profits" card style

### 16. `src/components/ui/card.tsx` - Card Variants Update
Add new card variants:
- `modern`: Very rounded, subtle shadow, almost no border
- Update existing variants for lighter aesthetic

---

## New Layout Structure

```text
+--------------------------------------------------+
| Header                                            |
+--------------------------------------------------+
| Welcome / Date Section + Quick Actions            |
+--------------------------------------------------+
| [Income]  [Expenses]  [Balance]  [Invest] [Month] |
|                                                   |
+--------------------------------------------------+
|                                                   |
|  [Monthly Income/Expense Chart - Large Card]      |
|                                                   |
+--------------------------------------------------+
|  [Category Pie] | [Top Expenses] | [Weekly Chart] |
+--------------------------------------------------+
|  [Balance Line Chart - 3/4]    | [Savings Ring]  |
+--------------------------------------------------+
|  [Yearly Balance Chart]                           |
+--------------------------------------------------+
|  [Transaction Table - Full Width]                 |
+--------------------------------------------------+
```

---

## Color Palette Mapping

| Reference Color | Wallet Equivalent |
|-----------------|-------------------|
| Coral/Orange accent | Primary Blue (`#1b17ff`) |
| Coral buttons | Blue buttons |
| Pink/coral backgrounds | Blue tints (`bg-primary/5`, `bg-primary/10`) |
| Dark text | Near black (`#171717`) |
| Muted text | Gray (`#737373`) |
| Card backgrounds | Pure white |
| Borders | Very light gray or none |

---

## Key Visual Changes

### Cards
- Border radius: `rounded-2xl` (16px) for large cards, `rounded-xl` (12px) for smaller
- Border: `border border-gray-100` or no border
- Shadow: `shadow-sm` or custom subtle shadow
- Background: Pure white

### Typography
- Values: `text-3xl md:text-4xl font-bold` for main numbers
- Labels: `text-sm text-muted-foreground`
- Headers: `text-lg font-semibold`

### Buttons
- Pill shaped: `rounded-full`
- Primary: Blue background with white text
- Ghost: Transparent with blue text

### Charts
- Use blue as primary data color
- Green for income, red for expenses (keep semantic)
- Blue for balance/neutral metrics

---

## Implementation Steps

1. Update CSS variables and add new utilities
2. Create new card styling in card.tsx
3. Redesign StatCard with modern layout
4. Update CategoryChart donut styling
5. Redesign MonthlyChart with cleaner bars
6. Update SavingsRateCard ring to blue theme
7. Modernize TopExpensesCard list
8. Clean up WeeklyComparisonChart
9. Simplify BalanceChart with blue line
10. Update InvestmentSummaryCard styling
11. Modernize MonthStatusIndicator
12. Clean up YearlyBalanceChart
13. Update banners (Empty, MonthClosing)
14. Modernize TransactionTable
15. Restructure Index.tsx layout with welcome section

---

## Technical Notes

- No changes to data hooks or business logic
- Keep all translations working
- Maintain responsive design (mobile-first)
- Keep animation delays for staggered load effect
- Preserve empty state handling
- Keep semantic colors for income (green) / expense (red)
- Use blue for primary accents, buttons, and neutral metrics
