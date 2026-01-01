
-- =============================================
-- PHASE 1: ENUMS
-- =============================================

CREATE TYPE app_domain AS ENUM ('CASHFLOW', 'INVESTING');
CREATE TYPE account_role AS ENUM ('CASH', 'INVESTMENT');
CREATE TYPE period_status AS ENUM ('OPEN', 'READY_TO_CLOSE', 'CLOSED');
CREATE TYPE import_status AS ENUM ('UPLOADED', 'PARSED', 'NORMALIZED', 'FAILED');
CREATE TYPE source_type AS ENUM ('BANK', 'BROKER', 'SAVINGS', 'CARD', 'OTHER');

-- =============================================
-- PHASE 2: NEW TABLES
-- =============================================

-- 1. accounts (user bank accounts, brokers, etc.)
CREATE TABLE public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  institution TEXT,
  account_role account_role NOT NULL DEFAULT 'CASH',
  domain_default app_domain,
  currency_base TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 2. periods (monthly accounting periods per domain)
CREATE TABLE public.periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month_key TEXT NOT NULL,
  domain app_domain NOT NULL,
  status period_status NOT NULL DEFAULT 'OPEN',
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_key, domain)
);

-- 3. imports (replaces uploads - with file hash for deduplication)
CREATE TABLE public.imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_id UUID REFERENCES public.periods(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  domain app_domain NOT NULL,
  source_type source_type NOT NULL DEFAULT 'OTHER',
  file_name TEXT NOT NULL,
  file_mime TEXT,
  file_size INTEGER,
  file_storage_url TEXT,
  file_hash_sha256 TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  status import_status NOT NULL DEFAULT 'UPLOADED',
  error_message TEXT,
  transactions_count INTEGER DEFAULT 0,
  UNIQUE(user_id, file_hash_sha256)
);

-- 4. import_rows (staging/raw data for audit and reprocessing)
CREATE TABLE public.import_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID REFERENCES public.imports(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  raw_json JSONB NOT NULL,
  row_hash_sha256 TEXT NOT NULL,
  parsed_date DATE,
  parsed_amount NUMERIC,
  parsed_currency TEXT,
  parsed_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(import_id, row_hash_sha256)
);

-- 5. categories (for both domains)
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain app_domain NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain, name)
);

-- 6. categorization_rules (auto-categorization patterns)
CREATE TABLE public.categorization_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain app_domain NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  match_field TEXT NOT NULL CHECK (match_field IN ('description_norm', 'merchant_norm')),
  match_type TEXT NOT NULL CHECK (match_type IN ('CONTAINS', 'STARTS_WITH', 'REGEX')),
  pattern TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. audit_log (traceability)
CREATE TABLE public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  diff_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. user_preferences (internationalization)
CREATE TABLE public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  base_currency TEXT NOT NULL DEFAULT 'EUR',
  locale TEXT NOT NULL DEFAULT 'es-ES',
  language TEXT NOT NULL DEFAULT 'es',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. exchange_rates (currency conversion cache)
CREATE TABLE public.exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  rate_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_currency, target_currency, rate_date)
);

-- =============================================
-- PHASE 3: MODIFY TRANSACTIONS TABLE
-- =============================================

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS domain app_domain DEFAULT 'CASHFLOW';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES public.periods(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS posted_date DATE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS auth_date DATE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount_base NUMERIC;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fx_rate NUMERIC DEFAULT 1;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description_raw TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description_norm TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_norm TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tx_type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES public.imports(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source_row_hash TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Create unique index for fingerprint-based deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_fingerprint 
ON public.transactions(user_id, domain, fingerprint) 
WHERE fingerprint IS NOT NULL;

-- =============================================
-- PHASE 4: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 5: RLS POLICIES
-- =============================================

-- accounts policies
CREATE POLICY "Users can view their own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- periods policies
CREATE POLICY "Users can view their own periods" ON public.periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own periods" ON public.periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own periods" ON public.periods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own periods" ON public.periods FOR DELETE USING (auth.uid() = user_id);

-- imports policies
CREATE POLICY "Users can view their own imports" ON public.imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own imports" ON public.imports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own imports" ON public.imports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own imports" ON public.imports FOR DELETE USING (auth.uid() = user_id);

-- import_rows policies (via import ownership)
CREATE POLICY "Users can view their own import_rows" ON public.import_rows FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.imports WHERE imports.id = import_rows.import_id AND imports.user_id = auth.uid()));
CREATE POLICY "Users can create their own import_rows" ON public.import_rows FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.imports WHERE imports.id = import_rows.import_id AND imports.user_id = auth.uid()));
CREATE POLICY "Users can delete their own import_rows" ON public.import_rows FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.imports WHERE imports.id = import_rows.import_id AND imports.user_id = auth.uid()));

-- categories policies (global read, admin write - for now everyone can read)
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);

-- categorization_rules policies
CREATE POLICY "Users can view their own rules" ON public.categorization_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own rules" ON public.categorization_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rules" ON public.categorization_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rules" ON public.categorization_rules FOR DELETE USING (auth.uid() = user_id);

-- audit_log policies
CREATE POLICY "Users can view their own audit logs" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own audit logs" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_preferences policies
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- exchange_rates policies (global read)
CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates FOR SELECT USING (true);

-- =============================================
-- PHASE 6: SEED DEFAULT CATEGORIES
-- =============================================

-- CASHFLOW categories
INSERT INTO public.categories (domain, name, icon, color) VALUES
('CASHFLOW', 'Alimentación', 'utensils', 'hsl(25, 95%, 53%)'),
('CASHFLOW', 'Transporte', 'car', 'hsl(217, 91%, 60%)'),
('CASHFLOW', 'Hogar', 'home', 'hsl(142, 71%, 45%)'),
('CASHFLOW', 'Entretenimiento', 'gamepad-2', 'hsl(280, 87%, 60%)'),
('CASHFLOW', 'Salud', 'heart-pulse', 'hsl(0, 84%, 60%)'),
('CASHFLOW', 'Educación', 'graduation-cap', 'hsl(199, 89%, 48%)'),
('CASHFLOW', 'Servicios', 'zap', 'hsl(45, 93%, 47%)'),
('CASHFLOW', 'Compras', 'shopping-bag', 'hsl(330, 81%, 60%)'),
('CASHFLOW', 'Viajes', 'plane', 'hsl(173, 80%, 40%)'),
('CASHFLOW', 'Suscripciones', 'repeat', 'hsl(262, 83%, 58%)'),
('CASHFLOW', 'Ingresos', 'trending-up', 'hsl(142, 76%, 36%)'),
('CASHFLOW', 'Otros', 'more-horizontal', 'hsl(220, 9%, 46%)');

-- INVESTING categories
INSERT INTO public.categories (domain, name, icon, color) VALUES
('INVESTING', 'Acciones', 'trending-up', 'hsl(217, 91%, 60%)'),
('INVESTING', 'ETFs', 'layers', 'hsl(142, 71%, 45%)'),
('INVESTING', 'Bonos', 'shield', 'hsl(45, 93%, 47%)'),
('INVESTING', 'Crypto', 'bitcoin', 'hsl(25, 95%, 53%)'),
('INVESTING', 'Fondos', 'pie-chart', 'hsl(280, 87%, 60%)'),
('INVESTING', 'Inmuebles', 'building', 'hsl(173, 80%, 40%)'),
('INVESTING', 'Dividendos', 'coins', 'hsl(142, 76%, 36%)'),
('INVESTING', 'Comisiones', 'receipt', 'hsl(0, 84%, 60%)'),
('INVESTING', 'Otros', 'more-horizontal', 'hsl(220, 9%, 46%)');

-- =============================================
-- PHASE 7: TRIGGER FOR user_preferences updated_at
-- =============================================

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
