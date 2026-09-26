-- Complete the to/from split for TRANSFER categories.
--
-- `from_investment` and `from_joint_account` were already fully wired on the frontend
-- (labels in categories.json, icons/colors in categoryTranslations.ts, CSS vars in
-- index.css, TRANSFER_CATEGORIES/TRANSFER_SLUGS) and the categorizer's flipTransferDirection()
-- already emits them for positive-amount transfers — but no `categories` row ever existed for
-- either slug, so any transaction the categorizer correctly tagged `from_investment` or
-- `from_joint_account` got a valid-looking category string with a null category_id (broken:
-- no dashboard aggregation by category_id, no rule/category-picker support).
--
-- `from_myself` is new: the mirror of `own_transfer` ("To Myself") for money flowing the other
-- way — sent alongside this migration's frontend/categorizer changes.
INSERT INTO public.categories (domain, movement_type, slug, name, color, icon) VALUES
  ('CASHFLOW', 'TRANSFER', 'from_myself',        'From Myself',        'hsl(220, 10%, 65%)', 'arrow-left-right'),
  ('CASHFLOW', 'TRANSFER', 'from_investment',     'From Investment',    'hsl(216, 60%, 55%)',  'trending-down'),
  ('CASHFLOW', 'TRANSFER', 'from_joint_account',  'From Joint Account', 'hsl(200, 70%, 58%)',  'users');
