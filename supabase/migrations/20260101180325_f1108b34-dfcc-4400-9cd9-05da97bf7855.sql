
-- =============================================
-- DATA MIGRATION: Existing uploads → imports, update transactions
-- =============================================

-- 1. Create periods for existing data (extract month from uploads.target_month)
INSERT INTO public.periods (user_id, month_key, domain, status)
SELECT DISTINCT 
  user_id,
  TO_CHAR(target_month, 'YYYY-MM') as month_key,
  'CASHFLOW'::app_domain as domain,
  'OPEN'::period_status as status
FROM public.uploads
WHERE target_month IS NOT NULL
ON CONFLICT (user_id, month_key, domain) DO NOTHING;

-- 2. Migrate uploads to imports
INSERT INTO public.imports (
  id, user_id, period_id, domain, source_type, 
  file_name, file_mime, file_size, file_storage_url,
  file_hash_sha256, uploaded_at, status, error_message, transactions_count
)
SELECT 
  u.id,
  u.user_id,
  p.id as period_id,
  'CASHFLOW'::app_domain as domain,
  'BANK'::source_type as source_type,
  u.file_name,
  u.file_type as file_mime,
  u.file_size,
  u.file_path as file_storage_url,
  COALESCE(u.file_path, u.id::text) as file_hash_sha256, -- Use file_path as temporary hash
  u.created_at as uploaded_at,
  CASE 
    WHEN u.status = 'completed' THEN 'NORMALIZED'::import_status
    WHEN u.status = 'processing' THEN 'PARSED'::import_status
    WHEN u.status = 'error' THEN 'FAILED'::import_status
    ELSE 'UPLOADED'::import_status
  END as status,
  u.error_message,
  u.transactions_count
FROM public.uploads u
LEFT JOIN public.periods p ON p.user_id = u.user_id 
  AND p.month_key = TO_CHAR(u.target_month, 'YYYY-MM')
  AND p.domain = 'CASHFLOW'
ON CONFLICT (user_id, file_hash_sha256) DO NOTHING;

-- 3. Update transactions with new columns
UPDATE public.transactions t
SET 
  domain = 'CASHFLOW',
  posted_date = t.date,
  description_raw = t.description,
  description_norm = LOWER(TRIM(REGEXP_REPLACE(t.description, '\s+', ' ', 'g'))),
  tx_type = CASE 
    WHEN t.type = 'income' THEN 'INCOME'
    WHEN t.type = 'transfer' THEN 'TRANSFER_INTERNAL'
    WHEN t.category = 'investment' OR t.category = 'Inversiones' THEN 'TRANSFER_TO_INVEST'
    ELSE 'EXPENSE'
  END,
  import_id = t.upload_id,
  fingerprint = COALESCE(t.transaction_hash, 
    encode(sha256(
      (t.user_id::text || 'CASHFLOW' || t.date::text || t.amount::text || LOWER(TRIM(t.description)))::bytea
    ), 'hex')
  ),
  period_id = p.id
FROM public.periods p
WHERE p.user_id = t.user_id 
  AND p.month_key = TO_CHAR(t.date, 'YYYY-MM')
  AND p.domain = 'CASHFLOW'
  AND t.domain IS NULL OR t.posted_date IS NULL;

-- 4. Create periods for investments
INSERT INTO public.periods (user_id, month_key, domain, status)
SELECT DISTINCT 
  user_id,
  TO_CHAR(date, 'YYYY-MM') as month_key,
  'INVESTING'::app_domain as domain,
  'OPEN'::period_status as status
FROM public.investments
ON CONFLICT (user_id, month_key, domain) DO NOTHING;

-- 5. Migrate investments to transactions table
INSERT INTO public.transactions (
  user_id, domain, date, posted_date, amount, description, 
  description_raw, description_norm, tx_type, bank,
  upload_id, import_id, fingerprint, type, category, period_id
)
SELECT 
  i.user_id,
  'INVESTING'::app_domain,
  i.date,
  i.date,
  i.amount,
  i.description,
  i.description,
  LOWER(TRIM(REGEXP_REPLACE(i.description, '\s+', ' ', 'g'))),
  CASE 
    WHEN i.type = 'deposit' THEN 'CONTRIBUTION'
    WHEN i.type = 'withdrawal' THEN 'WITHDRAWAL'
    WHEN i.type = 'dividend' THEN 'DIVIDEND'
    WHEN i.type = 'fee' THEN 'FEE'
    ELSE 'OTHER'
  END,
  i.platform,
  i.upload_id,
  i.upload_id,
  COALESCE(i.transaction_hash, 
    encode(sha256(
      (i.user_id::text || 'INVESTING' || i.date::text || i.amount::text || LOWER(TRIM(i.description)))::bytea
    ), 'hex')
  ),
  i.type,
  i.asset_type,
  p.id
FROM public.investments i
LEFT JOIN public.periods p ON p.user_id = i.user_id 
  AND p.month_key = TO_CHAR(i.date, 'YYYY-MM')
  AND p.domain = 'INVESTING'
WHERE NOT EXISTS (
  SELECT 1 FROM public.transactions t 
  WHERE t.user_id = i.user_id 
    AND t.domain = 'INVESTING' 
    AND t.fingerprint = COALESCE(i.transaction_hash, 
      encode(sha256(
        (i.user_id::text || 'INVESTING' || i.date::text || i.amount::text || LOWER(TRIM(i.description)))::bytea
      ), 'hex')
    )
);
