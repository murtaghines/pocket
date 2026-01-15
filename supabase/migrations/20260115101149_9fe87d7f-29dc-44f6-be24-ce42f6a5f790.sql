-- Add sports category to expenses
INSERT INTO public.categories (name, slug, domain, movement_type, icon, color)
VALUES ('Deportes', 'sports', 'CASHFLOW', 'EXPENSE', 'dumbbell', '#22c55e')
ON CONFLICT (slug, domain) DO NOTHING;