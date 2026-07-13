# Epic: Account hub & user settings

## Main files
- src/pages/Account.tsx (account hub, 4-tab shell — not uploads; uploads live in MyData.tsx)
- src/components/account/: AccountHeader, AccountOverviewTab, AccountBankAccountsTab,
  AccountPreferencesTab, AccountSecurityTab
- src/components/profile/: DeleteAccountDialog (still used by AccountSecurityTab)
- src/components/settings/: PreferencesForm (legacy, still used by old flows),
  AccountsManager (legacy), AccountFormDialog (shared bank-account create/edit dialog,
  used by AccountBankAccountsTab, imports/AccountSelectDialog, dashboard/AccountsStackCard)
- Hooks: useProfile, useUserPreferences, useAccounts, useAccountOverviewStats
- src/lib/accountColors.ts (color palette + `getAccountDisplayName`)
- Edge function: delete-account
- i18n: src/i18n/locales/en/account.json (namespace "account")

## Current state
Covers the user's own account: overview stats, bank account management, preferences,
and security (profile info + data export + deletion). Distinct from Auth
(signup/login/onboarding) and from Categories (which uses `src/components/settings/`
for category rules).

Hub is at `/account` with URL-driven tabs (?tab=overview|accounts|preferences|security).
`/profile` is a permanent redirect to `/account`.

## Decisions made
- 2026-07-12: added bank + nickname to cashflow accounts. Migration
  `accounts_bank_nickname_split` backfilled `institution` and updated the unique constraint.
  `getAccountDisplayName()` is the single display formatter.
- 2026-07-12: consolidated account-creation code paths onto shared `AccountFormDialog`.
- 2026-07-12: `AccountsStackCard` uses `account_id` FK for matching.
- 2026-07-12: backfilled missing `accounts.*` i18n keys in en/es profile.json.
- 2026-07-12: full account hub rework — replaced flat /profile page with /account 4-tab hub.
  - Overview tab: 4 stat cards (files, month coverage, transactions, categorization %)
    fed by `useAccountOverviewStats`; recent files with download links; accounts summary.
  - Bank accounts tab: rich cards per account with file/month/last-upload metrics, inline
    edit/primary/hide/delete. `getCashAccounts({ includeHidden })` filters hidden from dashboard.
    UI for hide toggle is wired; DB column `accounts.hidden_from_dashboard` NOT YET MIGRATED
    (pending explicit confirmation — toggle silently no-ops until migration runs).
  - Preferences tab: reorganized into Regional / Money / Appearance sections. Country
    field now editable post-signup (was write-only at onboarding). Theme toggle persists
    to localStorage via `useTheme` (DB column `user_preferences.theme text DEFAULT 'system'`
    exists but sync is localStorage-first pending cross-device work).
  - Security tab: inline name editor, client-side JSON data export, delete account.
  - Nav unified: DataRail / MobileBottomNav / DashboardLayout dropdown all use "Account"
    and link to /account. DashboardLayout uses MobileBottomNav component (no duplicate array).
  - Dead code removed: DashboardSidebar.tsx, Profile.tsx, ProfileHeader.tsx import paths.
  - MonthReviewModal.tsx renamed to AddManualEntryDialog.tsx (only exporter of that name).

## Deprecated DB columns (not dropped yet — needs explicit migration + confirmation)
- `user_preferences.selected_categories` — written at onboarding, never read. Safe to drop.
- `user_preferences.investment_platforms` — written at onboarding, never read. Safe to drop.
- `user_preferences.locale` — dead; `useLocalization` derives from `country`. Safe to drop.

## Next steps
- **Migration pending**: `ALTER TABLE accounts ADD COLUMN hidden_from_dashboard boolean NOT NULL DEFAULT false;`
  on project `ertwmshiupmickhfbaue`. After applying: regenerate types, hide toggle becomes live.
- Cross-device theme sync: write `user_preferences.theme` on change, read on login
  (currently only localStorage-backed).
- Drop deprecated DB columns in a future explicit migration.

## Decisions made (continued)
- 2026-07-12: removed dead DB writes from Auth.tsx onboarding: `selected_categories`,
  `investment_platforms`, and `locale` are no longer written (all were write-only; none
  are read anywhere in the app). `joint_account_names` kept (read by process-import).
- 2026-07-12: added account filter chips to MonthWorkspace — shows when 2+ accounts have
  imports in the active month. Chip state via URL `?account=<id>`; resets on month switch.
  `InlineTransactionsEditor` receives filtered imports based on selected chip.
- 2026-07-13: investment account linking — AccountSelectDialog extended with `accountRole` /
  `domainDefault` props; investment uploads now require account selection (same flow as bank
  statements). InvestmentTabsView wires the dialog before processFilesForMonth.
- 2026-07-13: investment accounts visible in hub — AccountBankAccountsTab split into Bank /
  Investment sections; AccountOverviewTab shows both roles with BANK/INV badge; Account tab
  renamed "Accounts"; es/account.json created; investment MonthWorkspace adds account filter
  chips; InlineInvestmentsEditor accepts filterUploadIds for post-filter without re-fetch.
- 2026-07-13: investments UploadedFiles: added download button (was missing; cashflow had it).
