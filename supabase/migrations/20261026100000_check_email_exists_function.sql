CREATE OR REPLACE FUNCTION public.check_email_exists(target_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = target_email);
$$;
