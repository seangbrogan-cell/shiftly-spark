DROP POLICY IF EXISTS "Users without an employer can create one" ON public.employers;
CREATE POLICY "Users without an employer can create one" ON public.employers FOR INSERT TO authenticated WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND employer_id IS NOT NULL)
);