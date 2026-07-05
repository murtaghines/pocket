---
paths:
  - "src/pages/Profile.tsx"
  - "src/components/profile/ProfileInfoCard.tsx"
  - "src/components/profile/ProfileHeader.tsx"
  - "src/components/profile/DeleteAccountDialog.tsx"
  - "src/components/settings/PreferencesForm.tsx"
  - "src/components/settings/AccountsManager.tsx"
  - "src/hooks/useProfile.tsx"
  - "src/hooks/useUserPreferences.tsx"
---
# Account settings & profile
- `Profile.tsx` is account settings (profile info, preferences, accounts, deletion) —
  it is NOT the uploads page. Uploads live in `MyData.tsx` (see .claude/rules/imports.md)
- Account deletion goes through the `delete-account` edge function (cascade FKs) — don't
  reimplement deletion client-side
- `PreferencesForm` writes user preferences; keep profile vs preferences separate
- `src/components/settings/` is shared with the Categories module — a change here may
  touch category rules too; check .claude/rules/categories.md
