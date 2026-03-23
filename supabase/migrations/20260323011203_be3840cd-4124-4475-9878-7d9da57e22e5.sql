
-- Allow authenticated users to insert employers (for onboarding)
CREATE POLICY "Authenticated users can create employers"
  ON public.employers FOR INSERT
  TO authenticated
  WITH CHECK (true);
