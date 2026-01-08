-- ============================================================
-- 1. Add movement_type column to categories table
-- This defines which movement type (INCOME/EXPENSE/TRANSFER) each category belongs to
-- ============================================================

-- Create enum for movement types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE movement_type AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
  END IF;
END $$;

-- Add movement_type column to categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS movement_type movement_type;

-- Add slug column for i18n translation keys
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS slug text;

-- ============================================================
-- 2. Add movement column to transactions table
-- ============================================================

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS movement movement_type;

-- ============================================================
-- 3. Clear existing CASHFLOW categories (they don't match new spec)
-- ============================================================

DELETE FROM public.categories WHERE domain = 'CASHFLOW';

-- ============================================================
-- 4. Insert new categories with proper structure
-- ============================================================

-- INCOME CATEGORIES
INSERT INTO public.categories (domain, movement_type, slug, name, icon, color) VALUES
('CASHFLOW', 'INCOME', 'salary', 'Salary', 'briefcase', 'hsl(142, 76%, 36%)'),
('CASHFLOW', 'INCOME', 'refunds', 'Refunds', 'rotate-ccw', 'hsl(199, 89%, 48%)'),
('CASHFLOW', 'INCOME', 'sales', 'Sales', 'shopping-bag', 'hsl(45, 93%, 47%)'),
('CASHFLOW', 'INCOME', 'transfers_in', 'Transfers In', 'arrow-down-left', 'hsl(220, 9%, 46%)'),
('CASHFLOW', 'INCOME', 'other_income', 'Other Income', 'plus-circle', 'hsl(280, 87%, 60%)');

-- EXPENSE CATEGORIES
INSERT INTO public.categories (domain, movement_type, slug, name, icon, color) VALUES
('CASHFLOW', 'EXPENSE', 'housing', 'Housing', 'home', 'hsl(25, 95%, 53%)'),
('CASHFLOW', 'EXPENSE', 'groceries', 'Groceries', 'shopping-cart', 'hsl(142, 71%, 45%)'),
('CASHFLOW', 'EXPENSE', 'restaurants', 'Restaurants', 'utensils', 'hsl(0, 84%, 60%)'),
('CASHFLOW', 'EXPENSE', 'transport', 'Transport', 'car', 'hsl(217, 91%, 60%)'),
('CASHFLOW', 'EXPENSE', 'health', 'Health', 'heart-pulse', 'hsl(330, 81%, 60%)'),
('CASHFLOW', 'EXPENSE', 'entertainment', 'Entertainment', 'gamepad-2', 'hsl(280, 87%, 60%)'),
('CASHFLOW', 'EXPENSE', 'shopping', 'Shopping', 'shopping-bag', 'hsl(262, 83%, 58%)'),
('CASHFLOW', 'EXPENSE', 'education', 'Education', 'graduation-cap', 'hsl(199, 89%, 48%)'),
('CASHFLOW', 'EXPENSE', 'subscriptions', 'Subscriptions', 'repeat', 'hsl(173, 80%, 40%)'),
('CASHFLOW', 'EXPENSE', 'travel', 'Travel', 'plane', 'hsl(45, 93%, 47%)'),
('CASHFLOW', 'EXPENSE', 'other_expense', 'Other', 'more-horizontal', 'hsl(220, 9%, 46%)');

-- TRANSFER CATEGORIES
INSERT INTO public.categories (domain, movement_type, slug, name, icon, color) VALUES
('CASHFLOW', 'TRANSFER', 'own_transfer', 'Own Account', 'arrow-left-right', 'hsl(220, 9%, 55%)'),
('CASHFLOW', 'TRANSFER', 'to_investment', 'To Investment', 'trending-up', 'hsl(217, 91%, 60%)');

-- ============================================================
-- 5. Add unique constraint on slug + domain for translation lookups
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_domain_idx ON public.categories(slug, domain);

-- ============================================================
-- 6. Create index for faster lookups by movement_type
-- ============================================================

CREATE INDEX IF NOT EXISTS categories_movement_type_idx ON public.categories(movement_type);
CREATE INDEX IF NOT EXISTS transactions_movement_idx ON public.transactions(movement);