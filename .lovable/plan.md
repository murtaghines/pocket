

## Plan: Revamp Registration Flow

### What changes
Replace the current 7-step registration (Name → Email → Country → Currency → Income Categories → Expense Categories → Password) with a new 6-step flow that adds investment/joint-account context and removes category selection (all categories enabled by default).

### New Steps
1. **Name** — First name + Last name (separate fields, used by categorizer)
2. **Email** — Same as current
3. **Country + Currency** — Merged into one step (country auto-fills currency via map)
4. **Investment Platforms** — Optional. Country-specific platforms + custom input
5. **Joint Account** — Optional. Toggle + co-holder names
6. **Password** — Same as current

No categories step. On signup, all categories are saved automatically.

### Database Migration
Add columns to `profiles` table:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS investment_platforms text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joint_account_names text[] DEFAULT '{}';
```

Also add these to `user_preferences` (since that's where the signup flow saves data):
```sql
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS investment_platforms text[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS joint_account_names text[] DEFAULT '{}';
```

### Files to Create
1. **`src/components/onboarding/StepInvestments.tsx`** — From uploaded file, adapted to work with Auth.tsx props pattern
2. **`src/components/onboarding/StepJointAccount.tsx`** — From uploaded file, adapted similarly

### Files to Modify
1. **`src/components/onboarding/StepName.tsx`** — Change to accept `firstName` + `lastName` as separate fields (from uploaded StepName.tsx)
2. **`src/components/onboarding/StepCountry.tsx`** — Merge currency selection into this step with auto-fill from country
3. **`src/pages/Auth.tsx`** — Restructure registration:
   - Change from 7 to 6 steps
   - Remove income/expense category steps
   - Add investment platforms + joint account steps
   - Store `firstName`/`lastName` separately
   - Save all categories by default on signup
   - Save `investment_platforms` and `joint_account_names` to user_preferences
4. **`src/components/onboarding/OnboardingModal.tsx`** — Update to match same flow (remove categories step, add investments + joint account)

### Key Data
- `COUNTRY_CURRENCY_MAP` and `INVESTMENT_PLATFORMS_BY_COUNTRY` constants will live in the OnboardingModal (shared) or a separate constants file
- All income + expense categories saved automatically without user selection

