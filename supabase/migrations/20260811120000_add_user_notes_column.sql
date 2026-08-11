alter table public.transactions
  add column if not exists user_notes text;
