-- Update category names and slugs
-- INCOME: Rename Investment Income to Investment
UPDATE public.categories SET name = 'Investment', slug = 'investment' 
WHERE slug = 'investments_income' AND domain = 'CASHFLOW';

-- INCOME: Rename Transfers In to Transfers
UPDATE public.categories SET name = 'Transfers', slug = 'transfers' 
WHERE slug = 'transfers_in' AND domain = 'CASHFLOW';

-- INCOME: Rename Rental Income to Rents
UPDATE public.categories SET name = 'Rents', slug = 'rents' 
WHERE slug = 'rental_income' AND domain = 'CASHFLOW';

-- Delete removed INCOME categories
DELETE FROM public.categories 
WHERE slug IN ('gifts_received', 'sales') AND domain = 'CASHFLOW';

-- Delete removed EXPENSE categories
DELETE FROM public.categories 
WHERE slug IN ('gifts_given', 'insurance', 'family', 'donations', 'personal_services', 'taxes') 
AND domain = 'CASHFLOW';