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
  - "src/hooks/useAccountOverviewStats.tsx"
  - "src/lib/accountColors.ts"
---
# Account hub & user settings
- The account hub lives at `/account` (4 tabs: General / Accounts / Preferences /
  Security). `/profile` is a permanent redirect to `/account`.
- Tab state is URL-driven: `/account?tab=accounts` etc. Default tab = general (no param). General = profile + data summary + quick links; no dashboard KPIs belong in the account hub.
- Page shell mirrors the Dashboard: header (identity left, segmented tab pills right) sits on the
  layout's blue band, tab content overlaps it with `md:mt-[-50px]`. Every block on the page is a
  white `bg-card rounded-xl p-5 md:p-6 shadow-section` card with an 18px/600 title (never put loose
  text directly on the band); settings tabs use a `lg:grid-cols-2` grid.
- Components for each tab live in `src/components/account/`. `DeleteAccountDialog` stays in
  `src/components/profile/` (reused by AccountSecurityTab). `src/components/profile/` no
  longer contains ProfileInfoCard or ProfileHeader — those are inlined in AccountSecurityTab
  and AccountHeader respectively.
- `AccountGeneralTab` fetches counts via `useAccountOverviewStats` hook — a fan-out query
  (imports + transactions in parallel). Don't add per-component fetches that duplicate this.
- `AccountFilesPanel` (per-account "Manage files" sheet on the Accounts tab) wraps
  `UploadedFilesHistoryList` from `imports/cashflow/UploadedFiles.tsx` — reuse, don't fork.
- `user_preferences.show_decimals` (bool, default true) feeds `formatCurrency` in
  `useLocalization`. `accounts.notes` (text) is edited in `AccountFormDialog`.
- Account deletion goes through the `delete-account` edge function (cascade FKs) — don't
  reimplement client-side.
- **Bank accounts have a bank (`institution`) and an optional nickname (`name`)** —
  e.g. "Revolut · Personal" / "Revolut · Shared". Always `getAccountDisplayName(account)`
  from `src/lib/accountColors.ts`. `accounts` is unique per `(user_id, institution, name)`.
- **Never insert into `accounts` directly.** Always through `useAccounts().createAccount`/
  `updateAccount` and the shared `AccountFormDialog` UI — reused by `AccountBankAccountsTab`
  (account hub), `AccountSelectDialog` (imports), and `AccountsStackCard` (dashboard).
- `getCashAccounts({ includeHidden?: boolean })` — default `false` (filters hidden accounts
  for dashboard consumers). Account manager views should pass `{ includeHidden: true }` or
  filter `accounts` directly.
- `accounts.hidden_from_dashboard` (bool NOT NULL DEFAULT false) — controls visibility in
  `AccountsStackCard` on the dashboard. Exposed as "Exclude from dashboard" in `AccountFormDialog`.
- `accounts.split_percentage` (smallint NOT NULL DEFAULT 100, range 1–100) — the user's
  ownership share of a joint account. Only shown in the form when `account_type === 'JOINT'`
  (defaults to 50). All dashboard SQL RPCs and materialized views multiply amounts by
  `split_percentage / 100.0` so the user sees only their share. When writing new aggregation
  queries, always JOIN accounts and apply `COALESCE(a.split_percentage, 100) / 100.0`.
- `user_preferences.theme` (text NOT NULL DEFAULT 'system') — DB column exists but theme is
  still localStorage-backed via `useTheme` (light / dark / system). Column reserved for cross-device sync later.
- `src/components/settings/` is shared with the Categories module — changes here may also
  affect category rules; check `.claude/rules/categories.md`.
