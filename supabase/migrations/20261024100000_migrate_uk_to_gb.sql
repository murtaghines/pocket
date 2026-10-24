-- Standardize country code: UK (non-standard) → GB (ISO 3166-1)
UPDATE public.user_preferences SET country = 'GB' WHERE country = 'UK';
