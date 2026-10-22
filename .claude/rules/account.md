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
- `/account` is three sidebar pages (no in-page tab bar): `?tab=accounts` (`AccountsWorkspace`),
  `?tab=files` (`FilesWorkspace`) and Settings (anything else, `AccountSettingsTab`: profile, session,
  preferences, data export, danger zone). Accounts and Files are master/detail workspaces cloned from
  Categories & rules and built on `components/layout/WorkspaceShell` — it owns the 180px banner, the
  translucent action pill + Bank/Investment selector (both 36px tall) and the content overlap (cards
  start 78px from the top). Never tweak those numbers per page; Categories uses `WorkspaceBanner` too.
  `/profile` redirects to `/account`; `/my-data?tab=accounts` → `/account?tab=accounts`; old
  `?tab=preferences|security` land on Settings. Deep links: `?account=<id>`, `?tab=files&file=<id>`,
  `?tab=files&account=<id>` (filters the list).
- Accounts detail (`AccountDetailPanel`): no balance/transactions (those live in Dashboard/Transactions);
  shows files, months, period, and settings edited in place (initial balance, share % for JOINT,
  exclude-from-dashboard, notes). The icon is fixed per account type; hovering it opens
  `AccountIdentityDialog` (name, nickname, colour from `ACCOUNT_COLOR_PALETTE`). Primary account is the
  star in the header. Account number is no longer asked for (column kept). Files here are read-only
  with a "Go to all files" link; assigning a file to an account happens in Files.
- Files detail (`FileDetailPanel`): details (account selector via `useReassignImport`, type, size,
  uploaded, last modified from `audit_log`, period, rows) and a raw-data preview from `useImportPreview`
  (`import_rows` when present, else the saved transactions' original bank text — CSV/Excel keep no raw copy).
- Settings page shell: header (identity) on the layout's blue band, cards start ~20px below it. Every
  block is a white `bg-card rounded-xl p-5 md:p-6 shadow-section` card with an 18px/600 title.
  Workspaces are `fullBleed` on desktop only (`useIsMobile`); mobile scrolls the document.
- `useAccountDetail` returns only the date range covered by an account. `AccountDeleteDialog` owns the
  reassign/force-delete flow. `DeleteAccountDialog` stays in `src/components/profile/`.
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
  `useLocalization`. `accounts.notes` (text) is edited in the account detail panel.
- `user_preferences.theme` (text NOT NULL DEFAULT 'system') — DB column exists but theme is
  still localStorage-backed via `useTheme` (light / dark / system). Column reserved for cross-device sync later.
- `src/components/settings/` is shared with the Categories module — changes here may also
  affect category rules; check `.claude/rules/categories.md`.
