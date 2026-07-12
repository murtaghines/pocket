# Epic: Account settings & profile

## Main files
- src/pages/Profile.tsx (account settings hub — not uploads; uploads live in MyData.tsx)
- src/components/profile/: ProfileInfoCard, ProfileHeader, DeleteAccountDialog
- src/components/settings/: PreferencesForm, AccountsManager, AccountFormDialog (shared
  bank-account create/edit dialog, also used by imports/AccountSelectDialog and
  dashboard/AccountsStackCard)
- Hooks: useProfile, useUserPreferences, useAccounts
- src/lib/accountColors.ts (color palette + `getAccountDisplayName`)
- Edge function: delete-account

## Current state
Covers the user's own account: profile info, app preferences, bank/account management,
and account deletion. Distinct from Auth (signup/login/onboarding) and from Categories
(which also uses `src/components/settings/` for category rules).

Bank accounts now support a bank (`institution`) + optional nickname (`name`), so a
user can have several accounts at the same bank distinguished by nickname (e.g.
"Revolut · Personal" / "Revolut · Shared") — see Decisions below.

## Decisions made
- 2026-07-12: added bank + nickname to cashflow accounts. Migration
  `accounts_bank_nickname_split` backfilled `institution` (was nullable/inconsistently
  set — only ever populated at signup, and always equal to `name` there) and replaced
  the `UNIQUE(user_id, name)` constraint with `UNIQUE(user_id, institution, name)`.
  `getAccountDisplayName()` (`src/lib/accountColors.ts`) is the single place that turns
  `{institution, name}` into display text ("Bank · Nickname", or just "Bank" if no
  nickname) — used by `AccountsManager`, `AccountSelectDialog`, `AccountsStackCard`,
  `TransactionTable`'s Account column (via `useTransactions`' `accountMap`), and the
  mobile `TransactionCardList` (which previously showed no account info at all).
- 2026-07-12: consolidated 3 independent account-creation code paths
  (`AccountsManager.tsx`, `AccountSelectDialog.tsx`, `AccountsStackCard.tsx` — the first
  went through the hook, the other two called `supabase.from('accounts').insert()`
  directly) onto one shared `AccountFormDialog` + `useAccounts().createAccount`. Fixed a
  bug found during design review where the color picker's value was silently discarded
  on create (only `updateAccount` persisted `color`).
- 2026-07-12: `AccountsStackCard` now matches transactions to accounts via the real
  `account_id` FK (added to the `Transaction` shape) instead of `tx.bank === acc.name`
  string equality, which would have gotten more fragile once accounts could share a
  bank name.
- 2026-07-12: backfilled missing `accounts.*` i18n keys in both `en/profile.json` and
  `es/profile.json` — most of this section's strings only existed as inline
  `t(key, defaultValue)` fallbacks with no real translation entry, so Spanish-speaking
  users saw English text. Also added `charts.accounts.*` keys to `dashboard.json`
  (same gap, used by `AccountsStackCard`).

## Next step
- `DeleteAccountDialog`'s "Delete My Account" button renders the literal string
  `deleteAccount.button` instead of translated text — its `t()` call uses a
  `deleteAccount` namespace/key that doesn't exist (real key is under `account.*` in
  `profile.json`). Pre-existing, spotted during this pass, not fixed (different section
  of the page, out of scope for the accounts-nickname work).
- Design review flagged (not fixed, pre-existing/low-risk, worth a follow-up):
  `AccountFormDialog`'s color palette is raw hex rendered via inline styles, while the
  category-color picker (`ColorIconPicker`) already established an HSL-token
  convention — worth reconciling. Also `TransactionCardList.tsx`'s amount text doesn't
  grey out transfers and is missing `tabular-nums` (pre-existing, file was only touched
  to add the new account-name line).
