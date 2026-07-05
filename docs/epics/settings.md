# Epic: Account settings & profile

## Main files
- src/pages/Profile.tsx (account settings hub — not uploads; uploads live in MyData.tsx)
- src/components/profile/: ProfileInfoCard, ProfileHeader, DeleteAccountDialog
- src/components/settings/: PreferencesForm, AccountsManager
- Hooks: useProfile, useUserPreferences, useAccounts
- Edge function: delete-account

## Current state
Covers the user's own account: profile info, app preferences, bank/account management,
and account deletion. Distinct from Auth (signup/login/onboarding) and from Categories
(which also uses `src/components/settings/` for category rules).

## Decisions made


## Next step
