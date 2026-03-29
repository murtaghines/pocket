

## Plan: Create `user_rules` Table and Add Transaction Columns

### What
Run the SQL migration the user provided to:
1. Create the `user_rules` table with RLS
2. Add 3 new columns to `transactions` table (`rule_id_applied`, `user_corrected`, `auto_recategorized`)

### Important Notes
- The `user_id` column references `profiles(id)` — but the `profiles` table uses `user_id` (uuid) as the user identifier, not `id`. The `id` column is an auto-generated UUID primary key, not the auth user ID. This means the foreign key should reference `profiles(user_id)` instead, OR better yet, reference `auth.users(id)` directly (but that's not recommended per project conventions). The safest approach: **remove the FK constraint** and just store `auth.uid()` directly, matching the pattern used by all other tables in this project (accounts, transactions, uploads, etc. all use `user_id uuid NOT NULL` without FK references).
- The `CHECK` constraints should be replaced with validation triggers per project guidelines (CHECK constraints must be immutable).

### Adjusted SQL
I'll run the migration with these corrections:
- `user_id` will be a plain `uuid NOT NULL` (no FK to profiles, matching project convention)
- Replace CHECK constraints with a validation trigger
- Keep everything else as specified

### Files to update after migration
Once the migration runs, the `src/integrations/supabase/types.ts` will auto-update. No immediate code changes needed — this is just the schema setup.

