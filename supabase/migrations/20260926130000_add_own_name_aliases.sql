-- Full-name aliases for the account owner, distinct from the existing `aliases` field in
-- the categorizer's UserContext (which only swaps the first name, keeping the same last
-- name — for nicknames/maiden names). This is for a genuinely different full name that
-- appears on bank statements: the account's display name (profiles.first_name/last_name)
-- may intentionally be a pseudonym (kept PII-free for the public demo), while raw bank
-- statement text still carries the user's real name. Any transaction description matching
-- an alias here is treated as own_transfer/from_myself by the categorizer, exactly like a
-- match on the profile's own first_name/last_name.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS own_name_aliases text[] NOT NULL DEFAULT '{}';
