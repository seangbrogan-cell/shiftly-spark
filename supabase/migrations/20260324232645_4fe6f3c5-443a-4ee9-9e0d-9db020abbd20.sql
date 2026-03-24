CREATE OR REPLACE FUNCTION public.get_employer_email(_employer_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE p.employer_id = _employer_id AND p.role = 'employer'
  LIMIT 1
$$;