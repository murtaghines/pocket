

## Plan: Update Dashboard Nav Logo

**Change:** In `DashboardLayout.tsx`, remove the pocket icon image and only keep the white text logo (`pocket-logo-white.png`), increasing its size from `h-4` to `h-5`.

**File:** `src/components/layout/DashboardLayout.tsx` (lines 47-49)

Replace the logo section:
```tsx
// Before
<img src={pocketIcon} alt="pocket" className="h-7 w-auto" />
<img src={pocketLogoWhite} alt="pocket" className="h-4 w-auto hidden sm:block" />

// After
<img src={pocketLogoWhite} alt="pocket" className="h-5 w-auto" />
```

Remove the unused `pocketIcon` import.

