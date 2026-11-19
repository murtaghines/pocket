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
  `?tab=files` (`FilesWorkspace`) and Settings (anything else, `AccountSettingsTab`: preference cards,
  data export, danger zone). Accounts uses master/detail via `WorkspaceShell`. Files uses a **single-column
  expandable list** on `WorkspaceBanner` (not `WorkspaceShell`) — no detail panel, no two-column grid.
  Page titles are `text-[19px] font-semibold tracking-[-0.01em]` Inter on every page (same as Transactions) —
  never `font-heading`. Never tweak those numbers per page; Categories uses `WorkspaceBanner` too.
  `/profile` redirects to `/account`; `/my-data?tab=accounts` → `/account?tab=accounts`; old
  `?tab=preferences|security` land on Settings. Deep links: `?account=<id>`,
  `?tab=files&account=<id>` (filters the file list).
- Accounts detail (`AccountDetailPanel`): no balance/transactions (those live in Dashboard/Transactions);
  shows four tiles (files, months, currency, period) and settings edited in place (initial balance, share % for JOINT,
  exclude-from-dashboard, notes). The icon is fixed per account type; hovering it opens
  `AccountIdentityDialog` (name and nickname only). Icon and colour come from the account TYPE: `getAccountTypeIcon` and `getAccountColor` (`ACCOUNT_TYPE_COLORS` in `lib/accountColors.ts`, blues / navies / grays only, no yellow). Never read `account.color` for display; the users don't pick colours. Primary account is the
  star in the header. Account number is no longer asked for (column kept). Files here are read-only
  with a "Go to all files" link; assigning a file to an account happens in Files.
- Files are administered only in the Files page (the banner has a "+ New file" button for bank role,
  which opens the standard `AccountSelectDialog` flow; investment upload is not supported here yet). `imports.display_name` is the
  title the user edits (`useRenameImport`); `imports.file_name` stays the identifier and is shown under the
  title. `Archive` on a file (`set_import_archived` RPC) keeps the data but hides the file and its
  transactions everywhere: `transactions.is_hidden` is set and `hidden_by_archive` remembers which rows
  were hidden by the archive, so restoring never unhides rows the user hid by hand. Account views skip
  archived files. Last edit per file comes from `get_import_last_edits`.
- Files expanded row (`FileExpandedPanel` inside `FilesWorkspace`): two-block layout — "Upload"/Carga
  (uploaded date+time, account, transaction count) and "Dates"/Fechas (período via `monthsInRange`,
  first date, last date via `useImportSummary`). No income/expenses/transfers — those are categorization
  data the user edits later. Eye button opens `FileContentsModal`: 960px dialog with 4-column table
  (Date, Week, Amount, Description) — no movement badges, no category dots, no color on amounts.
  Segmented "Last 10 / First 10" selector replaces the X close button; footer has Close + "Open in
  Transactions" only (no download). Powered by `useImportTransactions`. Action buttons: eye, download,
  archive, delete, expand/collapse. `FileDetailPanel` was deleted (orphaned after the redesign).
- Settings page shell: the header (name, email, member since + an "Edit profile" pill that opens
  `EditProfileDialog`) sits on the layout's blue band — the profile is never repeated in a card, and logout
  lives only in the sidebar. Cards start ~20px below it. Every
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
- `getCashAccounts({ includeArchived?, includeHidden? })` — both default `false`, so it returns the accounts the
  dashboard should show. Account manager / Transactions views must use `accounts` directly or pass both.
- Accounts are always listed in the order of `compareAccountsForDisplay` (`lib/accountTypes.ts`): checking, then
  joint, then savings (personal before joint), then the rest — same as the Transactions account tabs.
- `accounts.hidden_from_dashboard` (bool NOT NULL DEFAULT false) — "Exclude from dashboard" removes the account
  from EVERY dashboard number: `mv_daily_totals` / `mv_opening_balances`, `get_dashboard_aggregates`,
  `get_category_trends`, `get_weekday_spending`, `get_balance_at_date` filter it in SQL; the client drops it from
  the totals it sums (`useAccountPeriodSummary(..., excludeHidden)`, `usePeriodSummaryByRange`, BalanceBand),
  from `useTransactions({ excludeHiddenAccounts })` and the Year sankey. The Transactions page and per-account
  RPCs (`get_account_period_summary`, `get_account_opening_balances`) deliberately still include it. Any NEW
  dashboard aggregate must apply the same filter. `updateAccount` invalidates every query so the dashboard is
  never stale after an account edit.
- Account types: `CHECKING, SAVINGS, JOINT, JOINT_SAVINGS, CASH, CREDIT_CARD, LOAN, OTHER` + investment types.
  Shared types (`isSharedType`: JOINT, JOINT_SAVINGS) carry a share %; savings types (`isSavingsType`: SAVINGS,
  JOINT_SAVINGS) are kept out of spending analysis and dashboard totals in SQL (`mv_daily_totals`,
  `mv_opening_balances`, `get_balance_at_date`) and in the client. Never compare `account_type` to a single
  literal for these groups; use the helpers. The enum value was added in `20261023300000` and the existing
  shared savings account was moved in `20261023300100`.
- `accounts.split_percentage` (smallint NOT NULL DEFAULT 100, range 1–100) — the user's
  ownership share of a joint account. Only shown in the form when `account_type === 'JOINT'`
  (defaults to 50). All dashboard SQL RPCs and materialized views multiply amounts by
  `split_percentage / 100.0` so the user sees only their share. When writing new aggregation
  queries, always JOIN accounts and apply `COALESCE(a.split_percentage, 100) / 100.0`.
- Display formats: `user_preferences.display_format` (jsonb; decimal / group separators, currency
  position / space / symbol-or-code, date separator / style, 12-24h; missing key = follow the country's
  locale) is validated by `sanitizeDisplayFormat` and applied in `useLocalization` through
  `lib/displayFormat.ts` (pure, unit-tested). Empty format == plain Intl output. Don't call `Intl.NumberFormat`
  directly for user-visible money — use `formatCurrency`/`formatNumber`. `user_preferences.default_period`
  (month|week|year) is the dashboard start screen: the bare `/dashboard` URL means that view, others carry
  `?tab=` (see `hooks/useDashboardTab`). Weeks are ISO (Monday) everywhere — SQL, materialized views and
  client — so a "week starts on" preference is intentionally NOT offered.
- `user_preferences.show_decimals` (bool, default true) feeds `formatCurrency` in
  `useLocalization`. `accounts.notes` (text) is edited in the account detail panel.
- `user_preferences.theme` (text NOT NULL DEFAULT 'system') — DB column exists but theme is
  still localStorage-backed via `useTheme` (light / dark / system). Column reserved for cross-device sync later.
- `src/components/settings/` is shared with the Categories module — changes here may also
  affect category rules; check `.claude/rules/categories.md`.
