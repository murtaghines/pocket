-- Ensure all default categories exist with correct icons.
-- Uses ON CONFLICT to skip existing slugs; updates icon for any that drifted.

-- First, ensure unique constraint on (slug, domain) so upsert works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_slug_domain_unique'
  ) THEN
    -- Remove any duplicates first (keep the oldest by id)
    DELETE FROM public.categories a
    USING public.categories b
    WHERE a.slug = b.slug
      AND a.domain = b.domain
      AND a.id > b.id;

    ALTER TABLE public.categories
      ADD CONSTRAINT categories_slug_domain_unique UNIQUE (slug, domain);
  END IF;
END $$;

-- INCOME
INSERT INTO public.categories (name, slug, domain, movement_type, icon, color) VALUES
  ('Salary',      'salary',       'CASHFLOW', 'INCOME', 'briefcase',   '#FFD027'),
  ('Refunds',     'refunds',      'CASHFLOW', 'INCOME', 'rotate-ccw',  '#33B5E5'),
  ('Other Income','other_income',  'CASHFLOW', 'INCOME', 'more-horizontal', '#7C8594'),
  ('Investment',  'investment',    'CASHFLOW', 'INCOME', 'trending-up', '#2563A8'),
  ('Freelance',   'freelance',     'CASHFLOW', 'INCOME', 'laptop',     '#8B5CF6'),
  ('Rents',       'rents',         'CASHFLOW', 'INCOME', 'home',       '#E8913A')
ON CONFLICT (slug, domain) DO UPDATE SET
  icon = EXCLUDED.icon,
  movement_type = EXCLUDED.movement_type;

-- EXPENSE
INSERT INTO public.categories (name, slug, domain, movement_type, icon, color) VALUES
  ('Housing',       'housing',       'CASHFLOW', 'EXPENSE', 'home',            '#E8613A'),
  ('Groceries',     'groceries',     'CASHFLOW', 'EXPENSE', 'shopping-cart',   '#2E9E5B'),
  ('Restaurants',   'restaurants',   'CASHFLOW', 'EXPENSE', 'utensils',        '#E88A33'),
  ('Transport',     'transport',     'CASHFLOW', 'EXPENSE', 'car',             '#3B8FE8'),
  ('Health',        'health',        'CASHFLOW', 'EXPENSE', 'heart-pulse',     '#E04068'),
  ('Entertainment', 'entertainment', 'CASHFLOW', 'EXPENSE', 'gamepad-2',       '#9966CC'),
  ('Shopping',      'shopping',      'CASHFLOW', 'EXPENSE', 'shopping-bag',    '#5B6BCC'),
  ('Education',     'education',     'CASHFLOW', 'EXPENSE', 'graduation-cap',  '#1A8FA8'),
  ('Subscriptions', 'subscriptions', 'CASHFLOW', 'EXPENSE', 'repeat',          '#6B5BB5'),
  ('Travel',        'travel',        'CASHFLOW', 'EXPENSE', 'plane',           '#2E8A66'),
  ('Sports',        'sports',        'CASHFLOW', 'EXPENSE', 'dumbbell',        '#558A2E'),
  ('Other',         'other_expense', 'CASHFLOW', 'EXPENSE', 'more-horizontal', '#7C8594'),
  ('Pets',          'pets',          'CASHFLOW', 'EXPENSE', 'paw-print',       '#D4882E'),
  ('Taxes',         'taxes',         'CASHFLOW', 'EXPENSE', 'landmark',        '#8A7B33'),
  ('Insurance',     'insurance',     'CASHFLOW', 'EXPENSE', 'shield-check',    '#B54DA0'),
  ('Donations',     'donations',     'CASHFLOW', 'EXPENSE', 'heart-handshake', '#CC3D66')
ON CONFLICT (slug, domain) DO UPDATE SET
  icon = EXCLUDED.icon,
  movement_type = EXCLUDED.movement_type;

-- TRANSFER
INSERT INTO public.categories (name, slug, domain, movement_type, icon, color) VALUES
  ('To Myself',         'own_transfer',      'CASHFLOW', 'TRANSFER', 'arrow-left-right', '#6B7280'),
  ('From Myself',       'from_myself',       'CASHFLOW', 'TRANSFER', 'arrow-left-right', '#9BA3B0'),
  ('To Investment',     'to_investment',     'CASHFLOW', 'TRANSFER', 'trending-up',      '#2563A8'),
  ('From Investment',   'from_investment',   'CASHFLOW', 'TRANSFER', 'trending-down',    '#4080CC'),
  ('To Joint Account',  'to_joint_account',  'CASHFLOW', 'TRANSFER', 'users',            '#1A8FC8'),
  ('From Joint Account','from_joint_account','CASHFLOW', 'TRANSFER', 'users',            '#3AA5D4'),
  ('To Savings',        'to_savings',        'CASHFLOW', 'TRANSFER', 'piggy-bank',       '#2E8A66'),
  ('From Savings',      'from_savings',      'CASHFLOW', 'TRANSFER', 'piggy-bank',       '#4DA882')
ON CONFLICT (slug, domain) DO UPDATE SET
  icon = EXCLUDED.icon,
  movement_type = EXCLUDED.movement_type;
