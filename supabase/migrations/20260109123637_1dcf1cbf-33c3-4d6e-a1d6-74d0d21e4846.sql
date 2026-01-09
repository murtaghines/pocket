-- Insert new INCOME categories
INSERT INTO public.categories (name, slug, domain, movement_type, icon, color) VALUES
  ('Investment Income', 'investments_income', 'CASHFLOW', 'INCOME', 'trending-up', '#10B981'),
  ('Gifts Received', 'gifts_received', 'CASHFLOW', 'INCOME', 'gift', '#EC4899'),
  ('Freelance', 'freelance', 'CASHFLOW', 'INCOME', 'laptop', '#8B5CF6'),
  ('Rental Income', 'rental_income', 'CASHFLOW', 'INCOME', 'home', '#F59E0B');

-- Insert new EXPENSE categories
INSERT INTO public.categories (name, slug, domain, movement_type, icon, color) VALUES
  ('Pets', 'pets', 'CASHFLOW', 'EXPENSE', 'paw-print', '#F97316'),
  ('Gifts Given', 'gifts_given', 'CASHFLOW', 'EXPENSE', 'gift', '#EC4899'),
  ('Personal Services', 'personal_services', 'CASHFLOW', 'EXPENSE', 'scissors', '#6366F1'),
  ('Taxes', 'taxes', 'CASHFLOW', 'EXPENSE', 'landmark', '#64748B'),
  ('Family', 'family', 'CASHFLOW', 'EXPENSE', 'users', '#14B8A6'),
  ('Donations', 'donations', 'CASHFLOW', 'EXPENSE', 'heart-handshake', '#F43F5E'),
  ('Insurance', 'insurance', 'CASHFLOW', 'EXPENSE', 'shield-check', '#0EA5E9');