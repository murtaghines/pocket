-- Allow users to upload the same file multiple times (dedup happens at transaction level)
-- Remove unique constraint/index that blocks duplicate file hashes per user

ALTER TABLE public.imports
  DROP CONSTRAINT IF EXISTS imports_user_id_file_hash_sha256_key;

DROP INDEX IF EXISTS public.imports_user_file_hash_unique;