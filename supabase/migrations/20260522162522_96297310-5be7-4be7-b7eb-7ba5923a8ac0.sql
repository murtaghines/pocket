UPDATE public.transactions t
SET category = 'transfers',
    category_id = (SELECT id FROM public.categories WHERE slug='transfers' AND movement_type='INCOME' LIMIT 1)
WHERE t.category = 'transfers_in';

UPDATE public.transactions t
SET category = 'investment',
    category_id = (SELECT id FROM public.categories WHERE slug='investment' AND movement_type='INCOME' LIMIT 1)
WHERE t.category = 'investments_income';

UPDATE public.transactions t
SET category = 'rents',
    category_id = (SELECT id FROM public.categories WHERE slug='rents' AND movement_type='INCOME' LIMIT 1)
WHERE t.category = 'rental_income';

UPDATE public.transactions t
SET category = 'other_income',
    category_id = (SELECT id FROM public.categories WHERE slug='other_income' AND movement_type='INCOME' LIMIT 1)
WHERE t.category IN ('gifts_received','sales');

UPDATE public.transactions t
SET category = 'other_expense',
    category_id = (SELECT id FROM public.categories WHERE slug='other_expense' AND movement_type='EXPENSE' LIMIT 1)
WHERE t.category IN ('gifts_given','insurance','family','donations','personal_services','taxes');

-- Also re-categorize the Oxigent Technologies wire (and similar TRANSFERENCIA DE [empresa]) for the affected user
UPDATE public.transactions
SET category = 'transfers',
    category_id = (SELECT id FROM public.categories WHERE slug='transfers' AND movement_type='INCOME' LIMIT 1),
    categorized_by = 'sign_remap_v3'
WHERE movement = 'INCOME'
  AND category = 'other_income'
  AND amount > 0
  AND (description_raw ILIKE '%Transferencia Inmediata De %' OR description_raw ILIKE '%Transferencia De %');