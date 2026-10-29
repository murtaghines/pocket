-- Add 5 new income categories: gifts, benefits, sales, interest, cashback
-- These were either collapsed into other_income or missing entirely.
-- The categorizer already detected gifts_received and sales but the frontend
-- mapped them to other_income; benefits patterns were also in other_income.

-- Insert new category rows
INSERT INTO categories (domain, name, movement_type, slug, icon, color) VALUES
  ('CASHFLOW', 'Gifts',        'INCOME', 'gifts',    'gift',       'hsl(320, 58%, 56%)'),
  ('CASHFLOW', 'Benefits',     'INCOME', 'benefits', 'hand-coins', 'hsl(165, 60%, 42%)'),
  ('CASHFLOW', 'Sales',        'INCOME', 'sales',    'tag',        'hsl(80, 58%, 45%)'),
  ('CASHFLOW', 'Interest',     'INCOME', 'interest', 'percent',    'hsl(188, 70%, 42%)'),
  ('CASHFLOW', 'Cashback',     'INCOME', 'cashback', 'coins',      'hsl(120, 55%, 42%)')
ON CONFLICT DO NOTHING;

-- Rename gifts_received → gifts on existing transactions
UPDATE transactions
SET category = 'gifts'
WHERE category = 'gifts_received';

-- Recategorize benefits: transactions currently tagged other_income
-- whose descriptions match government benefit patterns
UPDATE transactions
SET category = 'benefits'
WHERE category = 'other_income'
  AND movement = 'INCOME'
  AND (
    description_norm ~* '(PRESTACION|PARO|SUBSIDIO|BECA|AYUDA\s*PUBLICA|SUBVENCION|MATERNIDAD|PATERNIDAD|INCAPACIDAD|PENSION|INGRESO\s*MINIMO\s*VITAL|ERTE|ANSES|ASIGNACION\s*FAMILIAR|AUH|JUBILACION|IFE|ALIMENTAR|BONO\s*GOBIERNO|BONO\s*COVID|PENSIONES\s*SOLIDARIAS|PBS|BPS|UNIVERSAL\s*CREDIT|JOBSEEKER|JSA|ESA|PIP|CHILD\s*BENEFIT|WORKING\s*TAX\s*CREDIT|HOUSING\s*BENEFIT|PENSION\s*CREDIT|SOCIAL\s*SECURITY|DISABILITY\s*BENEFIT|WELFARE|GOVERNMENT\s*GRANT|STIMULUS\s*CHECK|UNEMPLOYMENT|BURSARY|SCHOLARSHIP|STUDENT\s*LOAN\s*PAYMENT|GRANT\s*PAYMENT)'
  );

-- Recategorize interest: transactions currently tagged other_income or investment
-- whose descriptions match bank interest patterns (not investment returns)
UPDATE transactions
SET category = 'interest'
WHERE category IN ('other_income', 'investment')
  AND movement = 'INCOME'
  AND (
    description_norm ~* '(INTERESES\s*ABONADOS|INTERESES\s*CUENTA|LIQUIDACION\s*INTERESES|ABONO\s*INTERESES|INTERESES\s*ACREEDORES|INTERESES\s*A\s*FAVOR|INTERESES\s*GANADOS|INTERESES\s*CAJA\s*AHORRO|RENTA\s*DEPOSITO|SAVINGS\s*INTEREST|DEPOSIT\s*INTEREST|ACCOUNT\s*INTEREST|INTEREST\s*PAID|INTEREST\s*PAYMENT|CREDIT\s*INTEREST|ANNUAL\s*INTEREST|MONTHLY\s*INTEREST|BANK\s*INTEREST)'
  );

-- Recategorize cashback: transactions currently tagged other_income or refunds
-- whose descriptions match cashback/reward patterns
UPDATE transactions
SET category = 'cashback'
WHERE category IN ('other_income', 'refunds')
  AND movement = 'INCOME'
  AND (
    description_norm ~* '(CASHBACK|CASH\s*BACK|DEVOLUCION\s*TARJETA|BONIFICACION\s*TARJETA|RECOMPENSA\s*TARJETA|CARD\s*CASHBACK|CARD\s*REWARD|LOYALTY\s*REWARD|LOYALTY\s*CASHBACK|PURCHASE\s*REWARD|REWARD\s*CREDIT|POINTS\s*REDEMPTION|PUNTOS\s*CANJEADOS)'
  );

-- Note: 'sales' transactions are already tagged correctly by the categorizer
-- (the slug was just mapped to 'other_income' in the frontend legacy map).
-- We don't recategorize existing ones because there's no reliable way to
-- distinguish sales from other income in SQL alone — the categorizer's
-- patterns are contextual. Future transactions will get the 'sales' slug
-- directly now that the frontend no longer remaps it.
