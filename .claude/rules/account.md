---
paths:
  - "src/pages/Account.tsx"
  - "src/components/account/**"
  - "src/components/profile/DeleteAccountDialog.tsx"
  - "src/components/settings/PreferencesForm.tsx"
  - "src/components/settings/AccountsManager.tsx"
  - "src/components/settings/AccountFormDialog.tsx"
  - "src/hooks/useAccounts.tsx"
  - "src/hooks/useProfile.tsx"
  - "src/hooks/useUserPreferences.tsx"
  - "src/hooks/useAccountDetail.tsx"
  - "src/lib/accountColors.ts"
---
# Account hub & user settings
- `/account` is two sidebar pages (no in-page tab bar): `?tab=accounts` = accounts workspace
  (`AccountsWorkspace`: master/detail cloned from Categories & rules — banner with Bank / Investment
  segmented control, account list on the left, `AccountDetailPanel` on the right with balance/stats,
  settings, uploaded files and recent activity); anything else = Settings (`AccountSettingsTab`:
  profile, session, preferences, data export, danger zone). `/profile` redirects to `/account`;
  `/my-data?tab=accounts` redirects to `/account?tab=accounts`; old `?tab=preferences|security`
  land on Settings. `?account=<id>` deep-links a selected account.
- Settings page shell mirrors the Dashboard: header (identity) on the layout's blue band, content
  overlapping it with `md:mt-[-50px]`. Every block is a white `bg-card rounded-xl p-5 md:p-6
  shadow-section` card with an 18px/600 title (never loose text on the band); two-column grids.
  The workspace is `fullBleed` on desktop only (`useIsMobile`); mobile scrolls the document.
- Components live in `src/components/account/`. Per-account data comes from `useAccountDetail`
  (cash: transactions + `get_account_period_summary` balance; investment: via the account's imports →
  `investments`). File list is `UploadedFilesHistoryList` with `embedded` — reuse, don't fork.
  `AccountDeleteDialog` owns the reassign/force-delete flow. `DeleteAccountDialog` stays in
  `src/components/profile/`.
- Account deletion goes through the `delete-account` edge function (cascade FKs) — don't
  reimplement client-side.
- **Bank accounts have a bank (`institution`) and an optional nickname (`name`)** —
  e.g. "Revolut · Personal" / "Revolut · Shared". Always `getAccountDisplayName(account)`
  from `src/lib/accountColors.ts`. `accounts` is unique per `(user_id, institution, name)`.
- **Never insert into `accounts` directly.** Always through `useAccounts().createAccount`/
  `updateAccount` and the shared `AccountFormDialog` UI — reused by `AccountsWorkspace`,
  `AccountSelectDialog` (imports), and `AccountsStackCard` (dashboard).
- `getCashAccounts({ includeHidden?: boolean })` — default `false` (filters hidden accounts
  for dashboard consumers). Account manager views should pass `{ includeHidden: true }` or
  filter `accounts` directly.
- `accounts.hidden_from_dashboard` (bool NOT NULL DEFAULT false) — controls visibility in
  `AccountsStackCard` on the dashboard. Exposed as "Exclude from dashboard" in the form and detail panel.
- `accounts.split_percentage` (smallint NOT NULL DEFAULT 100, range 1–100) — the user's
  ownership share of a joint account. Only shown in the form when `account_type === 'JOINT'`
  (defaults to 50). All dashboard SQL RPCs and materialized views multiply amounts by
  `split_percentage / 100.0` so the user sees only their share. When writing new aggregation
  queries, always JOIN accounts and apply `COALESCE(a.split_percentage, 100) / 100.0`.
- `user_preferences.show_decimals` (bool, default true) feeds `formatCurrency` in
  `useLocalization`. `accounts.notes` (text) is edited in `AccountFormDialog`.
- `user_preferences.theme` (text NOT NULL DEFAULT 'system') — DB column exists but theme is
  still localStorage-backed via `useTheme` (light / dark / system). Column reserved for cross-device sync later.
- `src/components/settings/` is shared with the Categories module — changes here may also
  affect category rules; check `.claude/rules/categories.md`.
