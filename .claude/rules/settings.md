---
paths:
  - "src/pages/Profile.tsx"
  - "src/components/profile/ProfileInfoCard.tsx"
  - "src/components/profile/ProfileHeader.tsx"
  - "src/components/profile/DeleteAccountDialog.tsx"
  - "src/components/settings/PreferencesForm.tsx"
  - "src/components/settings/AccountsManager.tsx"
  - "src/components/settings/AccountFormDialog.tsx"
  - "src/hooks/useAccounts.tsx"
  - "src/hooks/useProfile.tsx"
  - "src/hooks/useUserPreferences.tsx"
  - "src/lib/accountColors.ts"
---
# Account settings & profile
- `Profile.tsx` is account settings (profile info, preferences, accounts, deletion) —
  it is NOT the uploads page. Uploads live in `MyData.tsx` (see .claude/rules/imports.md)
- Account deletion goes through the `delete-account` edge function (cascade FKs) — don't
  reimplement deletion client-side
- `PreferencesForm` writes user preferences; keep profile vs preferences separate
- `src/components/settings/` is shared with the Categories module — a change here may
  touch category rules too; check .claude/rules/categories.md
- **Bank accounts have a bank (`institution`) and an optional nickname (`name`)** —
  e.g. two accounts can both be at "Revolut", told apart by nickname ("Personal" /
  "Shared"). Never render/create an account display string by hand — always
  `getAccountDisplayName(account)` from `src/lib/accountColors.ts` ("Bank · Nickname",
  or just "Bank" if there's no nickname). `accounts` is unique per
  `(user_id, institution, name)`, not just `name` — a create/update that only sends
  `name` will violate this or silently collide.
- **Never insert into `accounts` directly with `supabase.from('accounts')`.** Always go
  through `useAccounts().createAccount`/`updateAccount`, and always through the shared
  `AccountFormDialog` (bank + nickname + color) for the UI — it's reused by
  `AccountsManager` (settings), `AccountSelectDialog` (in `src/components/imports/`,
  shown during file upload), and `AccountsStackCard` (dashboard). Adding a 4th ad-hoc
  creation form defeats the point of having consolidated the other three.
