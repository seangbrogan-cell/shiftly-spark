
-- Replace overly permissive policy with one that limits to one employer per user
DROP POLICY "Authenticated users can create employers" ON public.employers;

CREATE POLICY "Users without an employer can create one"
  ON public.employers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_employer_id(auth.uid()) IS NULL
  );
