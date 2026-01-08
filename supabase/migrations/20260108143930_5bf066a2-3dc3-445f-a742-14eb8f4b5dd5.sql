-- 1) Agregar columnas opcionales a transactions para riqueza sin romper generalidad
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS value_date date,
ADD COLUMN IF NOT EXISTS running_balance numeric,
ADD COLUMN IF NOT EXISTS source_transaction_id text,
ADD COLUMN IF NOT EXISTS payment_channel text,
ADD COLUMN IF NOT EXISTS counterparty_raw text,
ADD COLUMN IF NOT EXISTS category_source text DEFAULT 'DEFAULT',
ADD COLUMN IF NOT EXISTS categorization_rule_id uuid REFERENCES public.categorization_rules(id),
ADD COLUMN IF NOT EXISTS description_clean text;

-- 2) Agregar constraint para tx_type controlado
-- Primero eliminar el constraint si existe para poder recrearlo
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_tx_type_check;

-- Crear constraint CHECK para tx_type
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_tx_type_check 
CHECK (tx_type IS NULL OR tx_type IN ('INCOME', 'EXPENSE', 'TRANSFER_INTERNAL', 'SAVINGS_MOVE', 'INTEREST', 'FEE', 'REFUND', 'OTHER'));

-- 3) Constraints únicos para evitar duplicados

-- 3.1 UNIQUE en imports para evitar reimport del mismo archivo
ALTER TABLE public.imports DROP CONSTRAINT IF EXISTS imports_user_file_hash_unique;
CREATE UNIQUE INDEX IF NOT EXISTS imports_user_file_hash_unique 
ON public.imports(user_id, file_hash_sha256);

-- 3.2 UNIQUE en import_rows para evitar filas duplicadas
ALTER TABLE public.import_rows DROP CONSTRAINT IF EXISTS import_rows_import_row_hash_unique;
CREATE UNIQUE INDEX IF NOT EXISTS import_rows_import_row_hash_unique 
ON public.import_rows(import_id, row_hash_sha256);

-- 3.3 UNIQUE en transactions por fingerprint para evitar transacciones duplicadas
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_domain_fingerprint_unique;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_domain_fingerprint_unique 
ON public.transactions(user_id, domain, fingerprint) 
WHERE fingerprint IS NOT NULL;

-- 4) Índices para mejorar performance de queries
CREATE INDEX IF NOT EXISTS idx_transactions_posted_date ON public.transactions(posted_date);
CREATE INDEX IF NOT EXISTS idx_transactions_value_date ON public.transactions(value_date);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_type ON public.transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_transactions_category_source ON public.transactions(category_source);
CREATE INDEX IF NOT EXISTS idx_transactions_description_clean ON public.transactions(description_clean);
CREATE INDEX IF NOT EXISTS idx_transactions_fingerprint ON public.transactions(fingerprint);

-- 5) Comentarios para documentación
COMMENT ON COLUMN public.transactions.value_date IS 'Fecha valor si el statement la trae, sino NULL';
COMMENT ON COLUMN public.transactions.running_balance IS 'Saldo post operación si existe en el statement';
COMMENT ON COLUMN public.transactions.source_transaction_id IS 'ID externo del proveedor (ej: MercadoPago transaction ID)';
COMMENT ON COLUMN public.transactions.payment_channel IS 'Canal: CARD/TRANSFER/BIZUM/QR/CASH/OTHER';
COMMENT ON COLUMN public.transactions.counterparty_raw IS 'Nombre/contraparte raw del statement';
COMMENT ON COLUMN public.transactions.category_source IS 'Origen de categorización: MANUAL/RULE/AI/DEFAULT';
COMMENT ON COLUMN public.transactions.categorization_rule_id IS 'Referencia a la regla que categorizó esta transacción';
COMMENT ON COLUMN public.transactions.description_clean IS 'Descripción normalizada para dedupe y reglas';
COMMENT ON COLUMN public.transactions.tx_type IS 'Tipo: INCOME/EXPENSE/TRANSFER_INTERNAL/SAVINGS_MOVE/INTEREST/FEE/REFUND/OTHER';