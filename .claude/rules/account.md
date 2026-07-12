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
- The account hub lives at `/account` (4 tabs: Overview / Bank accounts / Preferences /
  Security). `/profile` is a permanent redirect to `/account`.
- Tab state is URL-driven: `/account?tab=accounts` etc. Default tab = overview (no param).
- Components for each tab live in `src/components/account/`. `DeleteAccountDialog` stays in
  `src/components/profile/` (reused by AccountSecurityTab). `src/components/profile/` no
  longer contains ProfileInfoCard or ProfileHeader — those are inlined in AccountSecurityTab
  and AccountHeader respectively.
- `AccountOverviewTab` fetches stats via `useAccountOverviewStats` hook — a fan-out query
  (imports + transactions in parallel). Don't add per-component fetches that duplicate this.
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
  `AccountsStackCard` on the dashboard. Toggle exposed in Bank accounts tab.
- `user_preferences.theme` (text NOT NULL DEFAULT 'system') — DB column exists but theme is
  still localStorage-backed via `useTheme`. Column reserved for cross-device sync later.
- `src/components/settings/` is shared with the Categories module — changes here may also
  affect category rules; check `.claude/rules/categories.md`.
